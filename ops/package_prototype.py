"""Package the deployable prototype, excluding credentials and local artifacts."""
from pathlib import Path
import io
import tarfile

root=Path(__file__).resolve().parents[1]
output=root/'.run'/'prototype.tar.gz'
output.parent.mkdir(exist_ok=True)
ignore={'.env','.git','node_modules','__pycache__','.pytest_cache','.venv','venv','artifacts','uploads'}
with tarfile.open(output,'w:gz') as archive:
    for directory in ['backend','testbed','ops','frontend/dist']:
        for path in (root/directory).rglob('*'):
            relative=path.relative_to(root)
            if path.is_file() and not path.is_symlink() and not any(part in ignore for part in relative.parts) and path.suffix not in {'.db','.pem','.key','.pyc'}:
                if path.suffix == '.sh':
                    data=path.read_bytes().replace(b'\r\n',b'\n')
                    info=archive.gettarinfo(str(path),arcname=relative.as_posix())
                    info.size=len(data)
                    archive.addfile(info,io.BytesIO(data))
                else:
                    archive.add(path,arcname=relative.as_posix(),recursive=False)
    for name in ['.dockerignore','vasuki_n8n_soar_workflow.json']:
        archive.add(root/name,arcname=name)
print(f'Prototype package: {output.stat().st_size} bytes; no credentials included')
