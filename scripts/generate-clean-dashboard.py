#!/usr/bin/env python3
"""
Script para gerar dashboard Grafana limpo e consistente em português
"""
import json

dashboard = {
    "annotations": {"list": []},
    "description": "Dashboard de Automação QA - Testes, Cobertura, Performance e Segurança",
    "editable": True,
    "fiscalYearStartMonth": 0,
    "graphTooltip": 1,
    "id": None,
    "links": [],
    "liveNow": False,
    "panels": [
        # ROW: RESUMO EXECUTIVO
        {
            "collapsed": False,
            "gridPos": {"h": 1, "w": 24, "x": 0, "y": 0},
            "id": 100,
            "panels": [],
            "title": "📊 RESUMO EXECUTIVO",
            "type": "row"
        },
        # STAT: Taxa de Aprovação
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
                            {"color": "yellow", "value": 90},
                            {"color": "green", "value": 95}
                        ]
                    },
                    "unit": "percent"
                }
            },
            "gridPos": {"h": 5, "w": 4, "x": 0, "y": 1},
            "id": 1,
            "options": {
                "colorMode": "value",
                "graphMode": "area",
                "justifyMode": "auto",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "auto"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_test_pass_rate",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Taxa de Aprovação",
            "type": "stat"
        },
        # STAT: Cobertura de Código
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
                            {"color": "yellow", "value": 75},
                            {"color": "green", "value": 85}
                        ]
                    },
                    "unit": "percent"
                }
            },
            "gridPos": {"h": 5, "w": 4, "x": 4, "y": 1},
            "id": 2,
            "options": {
                "colorMode": "value",
                "graphMode": "area",
                "justifyMode": "auto",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "auto"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_coverage_lines",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Cobertura de Código",
            "type": "stat"
        },
        # STAT: Latência P95
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
            "gridPos": {"h": 5, "w": 4, "x": 8, "y": 1},
            "id": 3,
            "options": {
                "colorMode": "value",
                "graphMode": "area",
                "justifyMode": "auto",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "auto"
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
        # STAT: Testes Falhados
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
                            {"color": "yellow", "value": 1},
                            {"color": "red", "value": 5}
                        ]
                    },
                    "unit": "short"
                }
            },
            "gridPos": {"h": 5, "w": 4, "x": 12, "y": 1},
            "id": 4,
            "options": {
                "colorMode": "value",
                "graphMode": "area",
                "justifyMode": "auto",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "auto"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_test_failed",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Testes Falhados",
            "type": "stat"
        },
        # STAT: Duração Total
        {
            "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "mappings": [],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "blue", "value": None},
                            {"color": "yellow", "value": 30},
                            {"color": "red", "value": 60}
                        ]
                    },
                    "unit": "s"
                }
            },
            "gridPos": {"h": 5, "w": 4, "x": 16, "y": 1},
            "id": 5,
            "options": {
                "colorMode": "value",
                "graphMode": "area",
                "justifyMode": "auto",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "auto"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_test_duration_seconds",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Duração Total",
            "type": "stat"
        },
        # STAT: Total de Testes
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
            "gridPos": {"h": 5, "w": 4, "x": 20, "y": 1},
            "id": 6,
            "options": {
                "colorMode": "value",
                "graphMode": "area",
                "justifyMode": "auto",
                "orientation": "auto",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "textMode": "auto"
            },
            "targets": [{
                "datasource": {"type": "prometheus", "uid": "PBFA97CFB590B2093"},
                "expr": "qa_test_total",
                "legendFormat": "",
                "refId": "A"
            }],
            "title": "Total de Testes",
            "type": "stat"
        }
    ],
    "refresh": "30s",
    "schemaVersion": 38,
    "style": "dark",
    "tags": ["qa", "testing", "automation", "coverage", "performance", "security"],
    "templating": {"list": []},
    "time": {"from": "now-24h", "to": "now"},
    "timepicker": {},
    "timezone": "",
    "title": "QA - Automação de Testes",
    "uid": "qa-automation-dashboard",
    "version": 0,
    "weekStart": ""
}

# Write to file
output_path = "monitoring/dashboards/qa-automation.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(dashboard, f, indent=2, ensure_ascii=False)

print(f"✅ Dashboard gerado em {output_path}")
print("📊 Características:")
print("  - Textos 100% em português")
print("  - Legendas limpas (sem 'Atual' repetido)")
print("  - Formatação consistente")
print("  - Emojis nos títulos de seções")
