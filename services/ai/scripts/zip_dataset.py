"""Compacta data/yolo em data/yolo.zip para subir ao Colab.

Rode de dentro de services/ai/data:

    cd C:\\Users\\Ramos\\Documents\\AlphaDog\\services\\ai\\data
    ..\\.venv\\Scripts\\python.exe ..\\scripts\\zip_dataset.py

Por que não Compress-Archive nem o ZipFile do PowerShell: os dois, no .NET
Framework do Windows PowerShell 5.1, gravam os caminhos com barra invertida
(`yolo\\images\\...`). O Linux do Colab não trata isso como pasta — vira um
arquivo de nome literal com barra, e o dataset descompacta quebrado. O zipfile
do Python sempre usa `/`. ZIP_STORED porque JPG já é comprimido: zipar de novo
não encolhe e só gasta tempo.
"""

import zipfile
from pathlib import Path

SRC = Path("yolo")
OUT = Path("yolo.zip")

if not SRC.is_dir():
    raise SystemExit(
        "pasta 'yolo' não encontrada. Rode este script de dentro de "
        "services/ai/data (onde fica o dataset convertido)."
    )

files = [p for p in SRC.rglob("*") if p.is_file()]
total = len(files)
with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_STORED) as z:
    for i, p in enumerate(files, 1):
        # as_posix() garante '/' em qualquer SO, com o prefixo 'yolo/'.
        z.write(p, arcname=p.as_posix())
        if i % 2000 == 0 or i == total:
            print(f"{i}/{total}", flush=True)

size_mb = OUT.stat().st_size / (1024 * 1024)
print(f"OK: {OUT} - {size_mb:,.0f} MB, {total} arquivos", flush=True)
