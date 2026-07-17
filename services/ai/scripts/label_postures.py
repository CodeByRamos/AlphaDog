"""Rotulador de postura.

Abre no navegador, mostra a foto com os keypoints desenhados e você marca
sentado / em pé / deitado / outro. Salva a cada clique.

    python scripts/label_postures.py

Usa só a biblioteca padrão: sem Flask, sem npm. O rotulador roda uma vez na
vida do projeto e não merece uma stack.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from alphadog_ai.labels import (  # noqa: E402
    MIN_PER_CLASS,
    PostureLabel,
    breed_from_path,
    is_ready_for_gate,
    label_summary,
    load_labels,
    save_labels,
)

PAGE = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>AlphaDog — rotular postura</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: system-ui, sans-serif; background: #0B0E14; color: #F7F5F1;
    display: flex; flex-direction: column; height: 100vh;
  }
  header {
    display: flex; align-items: center; gap: 24px; padding: 12px 20px;
    border-bottom: 1px solid #1D2438; flex-shrink: 0;
  }
  .counts { display: flex; gap: 16px; font-size: 13px; color: #9AA1B4; }
  .counts b { color: #F0A73C; font-variant-numeric: tabular-nums; }
  .ready { color: #3E8E7E; font-weight: 600; }
  main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; min-height: 0; }
  .stage { position: relative; max-height: 100%; }
  img { max-height: 62vh; max-width: 90vw; display: block; border-radius: 12px; }
  canvas { position: absolute; inset: 0; pointer-events: none; }
  footer { padding: 16px 20px 24px; border-top: 1px solid #1D2438; flex-shrink: 0; }
  .btns { display: flex; gap: 12px; justify-content: center; }
  button {
    font: inherit; font-weight: 600; padding: 14px 22px; border-radius: 10px;
    border: 2px solid #2E3650; background: #121826; color: #F7F5F1; cursor: pointer;
    min-width: 130px; transition: transform .1s, border-color .1s;
  }
  button:hover { border-color: #47506B; }
  button:active { transform: scale(.97); }
  button kbd {
    display: inline-block; margin-left: 8px; padding: 1px 6px; border-radius: 4px;
    background: #2E3650; font-size: 11px; color: #9AA1B4;
  }
  .sit { border-color: #F0A73C; }
  .stand { border-color: #5468A0; }
  .lie { border-color: #3E8E7E; }
  .hint { text-align: center; color: #6B7490; font-size: 12px; margin-top: 12px; }
  .meta { text-align: center; color: #6B7490; font-size: 12px; margin-bottom: 8px; }
  .done { text-align: center; padding: 60px 20px; }
  .done h1 { color: #3E8E7E; }
</style></head>
<body>
<header>
  <strong>Rotular postura</strong>
  <div class="counts" id="counts"></div>
  <div style="margin-left:auto;color:#6B7490;font-size:12px" id="progress"></div>
</header>
<main><div class="stage" id="stage"></div></main>
<footer>
  <div class="meta" id="meta"></div>
  <div class="btns">
    <button class="sit" onclick="send('sitting')">Sentado <kbd>1</kbd></button>
    <button class="stand" onclick="send('standing')">Em pé <kbd>2</kbd></button>
    <button class="lie" onclick="send('lying')">Deitado <kbd>3</kbd></button>
    <button onclick="send('other')">Outro <kbd>4</kbd></button>
    <button onclick="skip()">Pular <kbd>espaço</kbd></button>
  </div>
  <div class="hint">
    Sentado = bumbum no chão, tronco erguido &nbsp;·&nbsp; Deitado = barriga/lateral no chão
    &nbsp;·&nbsp; Outro = correndo, pulando, de costas, não dá pra dizer
  </div>
</footer>

<script>
let current = null;

async function load() {
  const res = await fetch('/api/next');
  const data = await res.json();

  document.getElementById('counts').innerHTML = Object.entries(data.counts)
    .map(([k, v]) => `${k}: <b>${v}</b>`).join('');
  document.getElementById('progress').textContent =
    data.ready ? '✓ pronto para o gate' : data.readyMessage;
  if (data.ready) document.getElementById('progress').className = 'ready';

  if (!data.item) {
    document.querySelector('main').innerHTML =
      '<div class="done"><h1>Acabou!</h1><p>Rótulos salvos. Pode fechar.</p></div>';
    document.querySelector('footer').style.display = 'none';
    return;
  }

  current = data.item;
  document.getElementById('meta').textContent = `${data.item.breed} · ${data.done} rotuladas`;

  const stage = document.getElementById('stage');
  stage.innerHTML = '';

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    canvas.style.width = img.clientWidth + 'px';
    canvas.style.height = img.clientHeight + 'px';
    stage.appendChild(canvas);
    draw(canvas, data.item, img.width, img.height);
  };
  img.src = '/img/' + encodeURIComponent(current.img_path);
  stage.appendChild(img);
}

function draw(canvas, item, w, h) {
  const ctx = canvas.getContext('2d');

  // Caixa: mostra o que o detector veria. A razão de aspecto dela é o sinal
  // mais forte do classificador, então vê-la ajuda a rotular consistente.
  const [bx, by, bw, bh] = item.bbox;
  ctx.strokeStyle = '#F0A73C'; ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);

  ctx.fillStyle = '#F0A73C';
  ctx.font = 'bold 14px system-ui';
  ctx.fillText(`r=${(bw / bh).toFixed(2)}`, bx + 4, by - 6);

  for (const [x, y, v] of item.joints) {
    if (!v) continue;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3E8E7E';
    ctx.fill();
    ctx.strokeStyle = '#05070B'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

async function send(label) {
  if (!current) return;
  await fetch('/api/label', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ img_path: current.img_path, label }),
  });
  load();
}

async function skip() {
  await fetch('/api/skip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ img_path: current.img_path }),
  });
  load();
}

addEventListener('keydown', (e) => {
  const map = { '1': 'sitting', '2': 'standing', '3': 'lying', '4': 'other' };
  if (map[e.key]) { e.preventDefault(); send(map[e.key]); }
  if (e.key === ' ') { e.preventDefault(); skip(); }
});

load();
</script>
</body></html>
"""


class State:
    def __init__(self, json_path: Path, images_root: Path, out: Path, limit: int):
        with json_path.open(encoding="utf-8") as f:
            entries = json.load(f)

        # Embaralha com seed fixo: amostra representativa das 120 raças, e o
        # mesmo conjunto entre execuções. Pegar as primeiras N daria só
        # Chihuahua.
        rng = random.Random(1337)
        rng.shuffle(entries)

        self.entries = entries[:limit]
        self.images_root = images_root
        self.out = out
        self.labels = load_labels(out)
        self.skipped: set[str] = set()
        self.labeled = {label.img_path for label in self.labels}

    def next_item(self) -> dict | None:
        for entry in self.entries:
            path = entry["img_path"]
            if path in self.labeled or path in self.skipped:
                continue
            if not (self.images_root / path).exists():
                continue
            return {
                "img_path": path,
                "breed": breed_from_path(path),
                "bbox": entry["img_bbox"],
                "joints": entry["joints"],
            }
        return None

    def add(self, img_path: str, label: str) -> None:
        self.labels.append(
            PostureLabel(
                img_path=img_path,
                label=label,
                breed=breed_from_path(img_path),
                is_mixed_breed=False,
            )
        )
        self.labeled.add(img_path)
        # Salva a cada clique: fechar a aba não pode perder 20 minutos de
        # trabalho.
        save_labels(self.out, self.labels)


def make_handler(state: State):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # silencia o log de cada request
            pass

        def _json(self, payload: dict) -> None:
            body = json.dumps(payload).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            parsed = urlparse(self.path)

            if parsed.path == "/":
                body = PAGE.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if parsed.path == "/api/next":
                ready, message = is_ready_for_gate(state.labels)
                self._json(
                    {
                        "item": state.next_item(),
                        "counts": label_summary(state.labels),
                        "done": len(state.labels),
                        "ready": ready,
                        "readyMessage": message,
                    }
                )
                return

            if parsed.path.startswith("/img/"):
                from urllib.parse import unquote

                rel = unquote(parsed.path[len("/img/") :])
                target = (state.images_root / rel).resolve()

                # Impede sair da pasta de imagens via ../ no caminho.
                if not target.is_relative_to(state.images_root.resolve()):
                    self.send_error(403)
                    return
                if not target.exists():
                    self.send_error(404)
                    return

                data = target.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return

            self.send_error(404)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length))

            if self.path == "/api/label":
                state.add(payload["img_path"], payload["label"])
                self._json({"ok": True})
                return

            if self.path == "/api/skip":
                state.skipped.add(payload["img_path"])
                self._json({"ok": True})
                return

            self.send_error(404)

    return Handler


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path, default=Path("data/StanfordExtra_V12/StanfordExtra_v12.json"))
    parser.add_argument("--images", type=Path, default=Path("data/stanford_dogs/Images"))
    parser.add_argument("--out", type=Path, default=Path("data/posture_labels.json"))
    parser.add_argument("--limit", type=int, default=600, help="Quantas fotos entram no pool.")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    if not args.json.exists():
        print(f"erro: {args.json} não existe", file=sys.stderr)
        return 1
    if not args.images.is_dir():
        print(f"erro: {args.images} não é diretório", file=sys.stderr)
        return 1

    state = State(args.json, args.images, args.out, args.limit)
    counts = label_summary(state.labels)

    print(f"pool: {len(state.entries)} fotos")
    print(f"já rotuladas: {len(state.labels)} — {counts}")
    print(f"meta: {MIN_PER_CLASS} por postura (sentado, em pé, deitado)")
    print(f"\nabrindo http://localhost:{args.port}")
    print("Ctrl+C para parar. Salva a cada clique.\n")

    server = HTTPServer(("127.0.0.1", args.port), make_handler(state))
    webbrowser.open(f"http://localhost:{args.port}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        ready, message = is_ready_for_gate(state.labels)
        print(f"\n{len(state.labels)} rótulos salvos em {args.out}")
        print("pronto para o gate" if ready else message)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
