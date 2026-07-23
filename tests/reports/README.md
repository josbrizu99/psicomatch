# Carpeta de Reportes de Pruebas

Esta carpeta contiene los reportes generados automáticamente por las herramientas de testing.

## Estructura

```
reports/
├── playwright/          # Reportes HTML de las pruebas E2E de usabilidad
│   └── results/         # Screenshots y videos de fallos
└── lighthouse/          # Reportes HTML de rendimiento por página
    └── *.html           # Un reporte por página auditada
```

## Cómo abrir los reportes

### Playwright
```bash
npm run test:e2e:report
```

### Lighthouse
Los reportes `.html` se pueden abrir directamente con el navegador.

> Esta carpeta es generada automáticamente. No subir a Git.
