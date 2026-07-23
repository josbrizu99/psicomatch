"""
Generador de Gráficos de Resultados de Pruebas de Usabilidad - PsicoMatch
==========================================================================
Lee el JSON exportado por Playwright y genera gráficos PNG listos para
incluir en la memoria del TFG.

Uso:
    python tests/analytics/generar_graficos.py

Genera en tests/reports/graficos/:
    1. resumen_general.png       — Pasaron / Fallaron (dona)
    2. duracion_por_test.png     — Tiempo de ejecución por test (barras)
    3. tests_por_categoria.png   — Tests agrupados por suite (barras apiladas)
    4. distribucion_duracion.png — Histograma de duración de tests
"""

import json
import os
import sys
import re
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # No necesita pantalla (headless)
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# ── Rutas ─────────────────────────────────────────────────────────────────────
BASE_DIR  = Path(__file__).resolve().parent.parent.parent
JSON_PATH = BASE_DIR / "tests" / "reports" / "results.json"
OUT_DIR   = BASE_DIR / "tests" / "reports" / "graficos"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Paleta de colores PsicoMatch ───────────────────────────────────────────────
COLOR_PASS    = "#14b8a6"   # Teal principal
COLOR_FAIL    = "#f87171"   # Rojo suave
COLOR_SKIP    = "#94a3b8"   # Gris azulado
COLOR_BG      = "#f8fafc"   # Fondo claro
COLOR_TEXT    = "#1e293b"   # Texto oscuro
COLOR_ACCENT  = "#6366f1"   # Índigo (secundario)
PALETTE       = [COLOR_PASS, COLOR_ACCENT, "#f59e0b", "#ec4899", "#06b6d4"]

FONT_TITLE    = {"fontsize": 15, "fontweight": "bold", "color": COLOR_TEXT}
FONT_LABEL    = {"fontsize": 11, "color": COLOR_TEXT}

plt.rcParams.update({
    "font.family":       "DejaVu Sans",
    "figure.facecolor":  COLOR_BG,
    "axes.facecolor":    COLOR_BG,
    "axes.edgecolor":    "#e2e8f0",
    "axes.grid":         True,
    "grid.color":        "#e2e8f0",
    "grid.linestyle":    "--",
    "grid.linewidth":    0.6,
    "xtick.color":       COLOR_TEXT,
    "ytick.color":       COLOR_TEXT,
})

# ── Carga de datos ─────────────────────────────────────────────────────────────
def load_results(path: Path) -> dict:
    if not path.exists():
        print(f"ERROR: No se encontró el archivo de resultados en:\n  {path}")
        print("\nEjecuta primero:\n  npx playwright test --project=\"Desktop Chrome\" --reporter=json > tests/reports/results.json")
        sys.exit(1)

    with open(path, encoding="utf-8-sig") as f:
        content = f.read()

    # El archivo puede tener texto extra antes del JSON; extraemos el JSON puro
    match = re.search(r"(\{.*)", content, re.DOTALL)
    if not match:
        print("ERROR: No se encontró JSON válido en el archivo de resultados.")
        sys.exit(1)

    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        # Intentar cargar el contenido directamente
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError as e:
            print(f"ERROR: JSON inválido: {e}")
            sys.exit(1)

def extract_tests(data: dict) -> list[dict]:
    """Extrae lista plana de todos los tests con sus metadatos de forma recursiva."""
    tests = []
    
    def process_suite(suite, parent_title=""):
        suite_title = suite.get("title", "").strip()
        
        # Ignorar nombres de archivo para que no salgan en los gráficos (ej. auth.spec.js)
        if suite_title.endswith(".js"):
            current_title = parent_title
        else:
            current_title = f"{parent_title} - {suite_title}" if parent_title and suite_title else suite_title or parent_title
        
        # Procesar specs en este suite
        for spec in suite.get("specs", []):
            for result in spec.get("tests", [spec]):
                for attempt in result.get("results", [{}]):
                    status = attempt.get("status", result.get("status", "unknown"))
                    tests.append({
                        "title":    spec.get("title", result.get("title", "Sin título")),
                        "suite":    current_title,
                        "status":   status,
                        "duration": attempt.get("duration", 0) / 1000,  # ms → s
                    })
                    break  # Solo primer intento
                    
        # Procesar suites anidados
        for nested_suite in suite.get("suites", []):
            process_suite(nested_suite, current_title)

    for suite in data.get("suites", []):
        process_suite(suite)
        
    return tests

# ── 1. Gráfico de dona: Resumen general ───────────────────────────────────────
def plot_summary(tests: list[dict]):
    passed = sum(1 for t in tests if t["status"] == "passed")
    failed = sum(1 for t in tests if t["status"] == "failed")
    skipped = sum(1 for t in tests if t["status"] in ("skipped", "pending"))
    total = len(tests)

    sizes  = [passed, failed, skipped]
    labels = [f"Pasaron\n{passed}", f"Fallaron\n{failed}", f"Omitidos\n{skipped}"]
    colors = [COLOR_PASS, COLOR_FAIL, COLOR_SKIP]

    # Eliminar segmentos vacíos
    non_zero = [(s, l, c) for s, l, c in zip(sizes, labels, colors) if s > 0]
    sizes, labels, colors = zip(*non_zero) if non_zero else ([], [], [])

    fig, ax = plt.subplots(figsize=(7, 6), facecolor=COLOR_BG)
    # pyrefly: ignore [bad-unpacking]
    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=labels,
        colors=colors,
        autopct="%1.0f%%",
        startangle=90,
        wedgeprops={"width": 0.55, "edgecolor": "white", "linewidth": 2},
        textprops={"color": COLOR_TEXT, "fontsize": 11},
    )
    for at in autotexts:
        at.set_fontsize(13)
        at.set_fontweight("bold")
        at.set_color("white")

    # Texto central
    ax.text(0, 0, f"{total}\ntests", ha="center", va="center",
            fontsize=20, fontweight="bold", color=COLOR_TEXT)

    ax.set_title("Tasa de Éxito en Pruebas de Usabilidad y Funcionalidad", **FONT_TITLE, pad=20)
    plt.tight_layout()
    out = OUT_DIR / "1_resumen_general.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {out.name}")

# ── 2. Barras horizontales: Duración por test ──────────────────────────────────
def plot_duration_by_test(tests: list[dict]):
    sorted_tests = sorted(tests, key=lambda t: t["duration"], reverse=True)
    titles   = [t["title"][:55] + ("…" if len(t["title"]) > 55 else "") for t in sorted_tests]
    durations = [t["duration"] for t in sorted_tests]
    colors   = [COLOR_PASS if t["status"] == "passed" else COLOR_FAIL for t in sorted_tests]

    fig_h = max(5, len(tests) * 0.45)
    fig, ax = plt.subplots(figsize=(12, fig_h), facecolor=COLOR_BG)

    bars = ax.barh(titles, durations, color=colors, height=0.6, edgecolor="white", linewidth=0.5)

    # Etiquetas de valor
    for bar, dur in zip(bars, durations):
        ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height() / 2,
                f"{dur:.1f}s", va="center", **FONT_LABEL)

    ax.set_xlabel("Duración (segundos)", **FONT_LABEL)
    ax.set_title("Tiempos de Respuesta por Funcionalidad Evaluada", **FONT_TITLE, pad=15)
    ax.invert_yaxis()
    ax.set_xlim(0, max(durations) * 1.2 if durations else 1)

    legend = [
        mpatches.Patch(color=COLOR_PASS, label="Pasó"),
        mpatches.Patch(color=COLOR_FAIL, label="Falló"),
    ]
    ax.legend(handles=legend, loc="lower right", fontsize=10)

    plt.tight_layout()
    out = OUT_DIR / "2_duracion_por_test.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {out.name}")

# ── 3. Barras apiladas: Tests por suite (categoría) ────────────────────────────
def plot_by_suite(tests: list[dict]):
    suites = {}
    for t in tests:
        # Limpiar el nombre de la suite (módulo) para que sea más presentable
        s = t["suite"] or "Módulo General"
        if s not in suites:
            suites[s] = {"passed": 0, "failed": 0, "skipped": 0}
        status = t["status"] if t["status"] in ("passed", "failed") else "skipped"
        suites[s][status] += 1

    names   = list(suites.keys())
    passed  = [suites[s]["passed"]  for s in names]
    failed  = [suites[s]["failed"]  for s in names]
    skipped = [suites[s]["skipped"] for s in names]

    x = np.arange(len(names))
    width = 0.55

    fig, ax = plt.subplots(figsize=(12, 5.5), facecolor=COLOR_BG)

    b1 = ax.bar(x, passed,  width, label="Pasaron",  color=COLOR_PASS,   edgecolor="white")
    b2 = ax.bar(x, failed,  width, label="Fallaron", color=COLOR_FAIL,   edgecolor="white", bottom=passed)
    b3 = ax.bar(x, skipped, width, label="Omitidos", color=COLOR_SKIP,   edgecolor="white",
                bottom=[p + f for p, f in zip(passed, failed)])

    # Etiquetas en cada barra
    for bars in [b1, b2, b3]:
        for bar in bars:
            h = bar.get_height()
            if h > 0:
                ax.text(bar.get_x() + bar.get_width() / 2,
                        bar.get_y() + h / 2,
                        str(int(h)), ha="center", va="center",
                        color="white", fontweight="bold", fontsize=11)

    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=15, ha="right", fontsize=10)
    ax.set_ylabel("Cantidad de pruebas", **FONT_LABEL)
    ax.set_title("Resultados por Módulo de la Aplicación", **FONT_TITLE, pad=15)
    ax.legend(fontsize=10)
    ax.set_ylim(0, max(p + f + s for p, f, s in zip(passed, failed, skipped)) * 1.2)

    plt.tight_layout()
    out = OUT_DIR / "3_tests_por_categoria.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {out.name}")

# ── 4. Histograma: Distribución de duración ────────────────────────────────────
def plot_duration_histogram(tests: list[dict]):
    durations = [t["duration"] for t in tests]
    if not durations:
        return

    fig, ax = plt.subplots(figsize=(8, 5), facecolor=COLOR_BG)

    n, bins, patches = ax.hist(durations, bins=8, color=COLOR_PASS, edgecolor="white",
                                linewidth=0.8, alpha=0.85)

    # Colorear barras por encima del umbral (>3s = lento)
    threshold = 3.0
    for patch, left in zip(patches, bins[:-1]):
        if left >= threshold:
            patch.set_facecolor(COLOR_ACCENT)

    ax.axvline(np.mean(durations), color=COLOR_FAIL, linestyle="--", linewidth=1.8,
               label=f"Media: {np.mean(durations):.2f}s")
    ax.axvline(threshold, color=COLOR_ACCENT, linestyle=":", linewidth=1.5,
               label=f"Umbral lento: {threshold}s")

    ax.set_xlabel("Duración (segundos)", **FONT_LABEL)
    ax.set_ylabel("Frecuencia (Cantidad de pruebas)", **FONT_LABEL)
    ax.set_title("Distribución del Rendimiento (Tiempos de Carga)", **FONT_TITLE, pad=15)
    ax.legend(fontsize=10)

    plt.tight_layout()
    out = OUT_DIR / "4_distribucion_duracion.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [OK] {out.name}")

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("\n══════════════════════════════════════════════")
    print("  Generador de Gráficos - PsicoMatch TFG")
    print("══════════════════════════════════════════════")
    print(f"\nLeyendo resultados desde:\n  {JSON_PATH}\n")

    data  = load_results(JSON_PATH)
    tests = extract_tests(data)

    if not tests:
        print("ERROR: No se encontraron tests en el JSON. Verifica el formato.")
        sys.exit(1)

    total  = len(tests)
    passed = sum(1 for t in tests if t["status"] == "passed")
    failed = sum(1 for t in tests if t["status"] == "failed")

    print(f"Tests encontrados: {total}  |  Pasaron: {passed}  |  Fallaron: {failed}\n")
    print("Generando gráficos...")

    plot_summary(tests)
    plot_duration_by_test(tests)
    plot_by_suite(tests)
    plot_duration_histogram(tests)

    print(f"\nGráficos guardados en:\n  {OUT_DIR}")
    print("\n══════════════════════════════════════════════\n")

if __name__ == "__main__":
    main()
