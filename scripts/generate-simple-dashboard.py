#!/usr/bin/env python3
"""
Dashboard Grafana Simples e Claro
Métricas essenciais em layout minimalista
"""
import json

dashboard = {
    "annotations": {"list": []},
    "description": "Dashboard Simples - Métricas Essenciais de QA",
    "editable": True,
    "fiscalYearStartMonth": 0,
    "graphTooltip": 1,
    "id": None,
    "links": [],
    "liveNow": False,
    "panels": [
        # STATS em linha única - métricas principais
        {
            "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "mappings": [],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "blue", "value": None}
                        ]
                    },
                    "unit": "short"
                }
            },
            "gridPos": {"h": 6, "w": 6, "x": 0, "y": 0},
            "id": 1,
            "options": {
                "colorMode": "background",
                "graphMode": "none",
                "justifyMode": "center",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "value_and_name"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_test_total",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Total de Testes",
            "type": "stat"
        },
        {
            "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "mappings": [],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "red", "value": None},
                            {"color": "yellow", "value": 80},
                            {"color": "green", "value": 90}
                        ]
                    },
                    "unit": "percent"
                }
            },
            "gridPos": {"h": 6, "w": 6, "x": 6, "y": 0},
            "id": 2,
            "options": {
                "colorMode": "background",
                "graphMode": "area",
                "justifyMode": "center",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "value_and_name"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_coverage_lines",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Cobertura (%)",
            "type": "stat"
        },
        {
            "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "mappings": [],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "green", "value": None},
                            {"color": "yellow", "value": 30},
                            {"color": "red", "value": 60}
                        ]
                    },
                    "unit": "s"
                }
            },
            "gridPos": {"h": 6, "w": 6, "x": 12, "y": 0},
            "id": 3,
            "options": {
                "colorMode": "background",
                "graphMode": "area",
                "justifyMode": "center",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "value_and_name"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_test_duration_seconds",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Tempo de Execução",
            "type": "stat"
        },
        {
            "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "mappings": [],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "green", "value": None},
                            {"color": "yellow", "value": 150},
                            {"color": "red", "value": 300}
                        ]
                    },
                    "unit": "ms"
                }
            },
            "gridPos": {"h": 6, "w": 6, "x": 18, "y": 0},
            "id": 4,
            "options": {
                "colorMode": "background",
                "graphMode": "area",
                "justifyMode": "center",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "value_and_name"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_perf_response_time_p95",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Latência P95",
            "type": "stat"
        },
        # Gráfico de Aprovação ao longo do tempo
        {
            "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "palette-classic"},
                    "custom": {
                        "axisCenteredZero": False,
                        "axisColorMode": "text",
                        "axisLabel": "Taxa de Aprovação",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "line",
                        "fillOpacity": 30,
                        "gradientMode": "opacity",
                        "hideFrom": {
                            "tooltip": False,
                            "viz": False,
                            "legend": False
                        },
                        "lineInterpolation": "smooth",
                        "lineWidth": 3,
                        "pointSize": 6,
                        "scaleDistribution": {"type": "linear"},
                        "showPoints": "auto",
                        "spanNulls": False,
                        "stacking": {"group": "A", "mode": "none"},
                        "thresholdsStyle": {"mode": "line"}
                    },
                    "mappings": [],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "transparent", "value": None},
                            {"color": "red", "value": 90},
                            {"color": "green", "value": 95}
                        ]
                    },
                    "unit": "percent"
                },
                "overrides": [{
                    "matcher": {"id": "byName", "options": "Taxa de Aprovação"},
                    "properties": [{
                        "id": "color",
                        "value": {"fixedColor": "green", "mode": "fixed"}
                    }]
                }]
            },
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 6},
            "id": 5,
            "options": {
                "legend": {
                    "calcs": ["last", "mean", "min"],
                    "displayMode": "table",
                    "placement": "bottom",
                    "showLegend": True
                },
                "tooltip": {"mode": "multi", "sort": "none"}
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_test_pass_rate",
                "legendFormat": "Taxa de Aprovação",
                "refId": "A"
            }],
            "title": "Qualidade ao Longo do Tempo",
            "type": "timeseries"
        },
        # Gráfico de Performance
        {
            "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "palette-classic"},
                    "custom": {
                        "axisCenteredZero": False,
                        "axisColorMode": "text",
                        "axisLabel": "Latência (ms)",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "line",
                        "fillOpacity": 20,
                        "gradientMode": "none",
                        "hideFrom": {
                            "tooltip": False,
                            "viz": False,
                            "legend": False
                        },
                        "lineInterpolation": "smooth",
                        "lineWidth": 2,
                        "pointSize": 5,
                        "scaleDistribution": {"type": "linear"},
                        "showPoints": "auto",
                        "spanNulls": False,
                        "stacking": {"group": "A", "mode": "none"},
                        "thresholdsStyle": {"mode": "off"}
                    },
                    "mappings": [],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "green", "value": None}
                        ]
                    },
                    "unit": "ms"
                },
                "overrides": [
                    {
                        "matcher": {"id": "byName", "options": "P50"},
                        "properties": [{
                            "id": "color",
                            "value": {"fixedColor": "green", "mode": "fixed"}
                        }]
                    },
                    {
                        "matcher": {"id": "byName", "options": "P95"},
                        "properties": [{
                            "id": "color",
                            "value": {"fixedColor": "yellow", "mode": "fixed"}
                        }]
                    },
                    {
                        "matcher": {"id": "byName", "options": "P99"},
                        "properties": [{
                            "id": "color",
                            "value": {"fixedColor": "red", "mode": "fixed"}
                        }]
                    }
                ]
            },
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 6},
            "id": 6,
            "options": {
                "legend": {
                    "calcs": ["last", "mean", "max"],
                    "displayMode": "table",
                    "placement": "bottom",
                    "showLegend": True
                },
                "tooltip": {"mode": "multi", "sort": "none"}
            },
            "targets": [
                {
                    "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                    "expr": "qa_perf_response_time_p50",
                    "legendFormat": "P50",
                    "refId": "A"
                },
                {
                    "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                    "expr": "qa_perf_response_time_p95",
                    "legendFormat": "P95",
                    "refId": "B"
                },
                {
                    "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                    "expr": "qa_perf_response_time_p99",
                    "legendFormat": "P99",
                    "refId": "C"
                }
            ],
            "title": "Performance ao Longo do Tempo",
            "type": "timeseries"
        },
        # Distribuição de testes
        {
            "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "palette-classic"},
                    "custom": {
                        "axisCenteredZero": False,
                        "axisColorMode": "text",
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "barAlignment": 0,
                        "drawStyle": "bars",
                        "fillOpacity": 90,
                        "gradientMode": "none",
                        "hideFrom": {
                            "tooltip": False,
                            "viz": False,
                            "legend": False
                        },
                        "lineInterpolation": "linear",
                        "lineWidth": 1,
                        "pointSize": 5,
                        "scaleDistribution": {"type": "linear"},
                        "showPoints": "never",
                        "spanNulls": False,
                        "stacking": {"group": "A", "mode": "normal"},
                        "thresholdsStyle": {"mode": "off"}
                    },
                    "mappings": [],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "green", "value": None}
                        ]
                    },
                    "unit": "short"
                },
                "overrides": [
                    {
                        "matcher": {"id": "byName", "options": "Aprovados"},
                        "properties": [{
                            "id": "color",
                            "value": {"fixedColor": "green", "mode": "fixed"}
                        }]
                    },
                    {
                        "matcher": {"id": "byName", "options": "Falhados"},
                        "properties": [{
                            "id": "color",
                            "value": {"fixedColor": "red", "mode": "fixed"}
                        }]
                    }
                ]
            },
            "gridPos": {"h": 7, "w": 24, "x": 0, "y": 14},
            "id": 7,
            "options": {
                "legend": {
                    "calcs": ["last"],
                    "displayMode": "list",
                    "placement": "bottom",
                    "showLegend": True
                },
                "tooltip": {"mode": "multi", "sort": "none"}
            },
            "targets": [
                {
                    "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                    "expr": "qa_test_passed",
                    "legendFormat": "Aprovados",
                    "refId": "A"
                },
                {
                    "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                    "expr": "qa_test_failed",
                    "legendFormat": "Falhados",
                    "refId": "B"
                }
            ],
            "title": "Resultados dos Testes",
            "type": "timeseries"
        }
    ],
    "refresh": "30s",
    "schemaVersion": 38,
    "style": "dark",
    "tags": ["qa", "simple", "clean"],
    "templating": {"list": []},
    "time": {"from": "now-6h", "to": "now"},
    "timepicker": {},
    "timezone": "",
    "title": "QA - Dashboard Simples",
    "uid": "qa-simple-dashboard",
    "version": 0,
    "weekStart": ""
}

# Write to file
output_path = "monitoring/dashboards/qa-simple.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(dashboard, f, indent=2, ensure_ascii=False)

print(f"✅ Dashboard simples gerado em {output_path}")
print("📊 Layout:")
print("  - 4 cards grandes com métricas principais")
print("  - 2 gráficos de linha (qualidade + performance)")
print("  - 1 gráfico de barras (resultados)")
print("  - Texto grande e legível")
print("  - Cores claras e intuitivas")
