"""Exercise repeated agent feedback and prove failed cycles cannot publish."""
import asyncio
import copy
import sys
from pathlib import Path
import pytest
from git import Repo

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from services import pipeline_orchestrator as pipeline

@pytest.mark.parametrize('passes_on',[3,None])
@pytest.mark.parametrize('rejected_by',['review','tests'])
def test_repeated_feedback_requires_review_and_tests_before_delivery(tmp_path,monkeypatch,passes_on,rejected_by):
    repository=tmp_path/'repo'; repository.mkdir()
    source=repository/'app.py'; source.write_text('value = 0\n')
    repo=Repo.init(repository)
    repo.index.add(['app.py'])
    with repo.config_writer() as config:
        config.set_value('user','name','test'); config.set_value('user','email','test@example.com')
    repo.index.commit('baseline')
    artifacts=tmp_path/'artifacts'; artifacts.mkdir()
    updates=[]; events=[]; tested=[]; reviews=[]; repairs=[]; deliveries=[]
    finding={'id':'flaw','file':'app.py','category':'sql-injection','message':'dynamic SQL','cwe_id':'CWE-89'}
    patch={'vulnerability_id':'flaw','file':'app.py','category':'sql-injection','model_used':'test-engine'}
    baseline={'passed':1,'failed':1,'errors':0,'total':2,'cases':[{'id':'functional','status':'passed'},{'id':'security','status':'failed','security':True}],
              'build':{'success':True},'test_inputs':{'unchanged':True},'runner':'docker'}
    async def update(_scan_id,**fields): updates.append(copy.deepcopy(fields))
    async def emit(_scan_id,message,data=None,level='info'): events.append({'message':message,**(data or {})})
    async def state(*args): pass
    async def scanner(*args): return {'repo_path':str(repository),'project_root':str(repository),'vulnerabilities':[finding],
                                      'base_sha':repo.head.commit.hexsha,'branch':'main','dependency_audit':{},'blast_radius':['app.py']}
    async def base(*args,**kwargs): return copy.deepcopy(baseline)
    async def patcher(*args):
        source.write_text('value = 1\n')
        return {'patches':[patch],'branch_name':'vasuki/test'}
    async def reviewer(*args):
        number=len(reviews)+1; reviews.append(number)
        passed=rejected_by=='tests' or passes_on is not None and number>=passes_on
        return {'confidence_score':100 if passed else 0,'review_notes':{'all_findings_resolved':passed,
               'summary':{'approved':int(passed),'rejected':int(not passed)},'remaining_findings':[] if passed else [finding]}}
    async def tester(*args,attempt=1):
        tested.append(attempt)
        passed=rejected_by=='review' or passes_on is not None and attempt>=passes_on
        after={**copy.deepcopy(baseline),'passed':2,'failed':0,'success':True,'cases':[{'id':'functional','status':'passed'},{'id':'security','status':'passed','security':True}]}
        if not passed:
            after.update(success=False,passed=1,failed=1)
            after['cases'][1]['status']='failed'
        return {'test_results':{'original_tests':copy.deepcopy(baseline),'patched_tests':after,'regression_free':passed,
                               'regressions':[],'missing_tests':[],'fixed_tests':['security'],'security_tests_count':1,'security_tests_passed':True}}
    async def repair(*args):
        repairs.append(len(repairs)+1); source.write_text(f'value = {len(repairs)+1}\n'); return True
    async def commit(path,summary,scan_id,files):
        deliveries.append('commit'); repo.index.add(files); repo.index.commit('verified patch'); return True
    async def push(*args): deliveries.append('push'); return True
    async def pr(*args): deliveries.append('pr'); return {'pr_url':'https://github.com/test/repo/pull/1','pr_number':1}
    for name,func in [('run_scanner',scanner),('run_baseline_tester',base),('run_patcher',patcher),('run_reviewer',reviewer),
                      ('run_tester',tester),('repair_review_findings',repair),('repair_regressions',repair),
                      ('commit_patches',commit),('push_branch',push),('create_pull_request',pr),('_update_job',update),
                      ('emit_pipeline',emit),('set_scan_state',state)]: monkeypatch.setattr(pipeline,name,func)
    monkeypatch.setattr(pipeline,'scan_directory',lambda _:artifacts)
    monkeypatch.setattr(pipeline.settings,'MAX_REPAIR_ROUNDS',3)
    asyncio.run(pipeline._run('test-scan','https://github.com/test/repo','main','',False,True))
    assert reviews==tested==[1,2,3]
    assert len(repairs)==2
    handoffs=[e['active_agent'] for e in events if 'active_agent' in e]
    expected=['scanner','tester','patcher','reviewer','tester','patcher','reviewer','tester','patcher','reviewer','tester']
    assert handoffs==expected+(['deployer'] if passes_on else [])
    result=updates[-1]
    assert result['status'].value==('completed' if passes_on else 'blocked')
    assert len(result['test_results']['rounds'])==3
    assert deliveries==(['commit','push','pr'] if passes_on else [])
