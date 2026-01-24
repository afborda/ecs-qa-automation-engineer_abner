#!/usr/bin/env python3
"""
Script para atualizar as legendas do dashboard Grafana.
Remove '{{branch}}' repetido e usa textos mais claros em português.
"""

import json
import os

# Caminho do arquivo
dashboard_path = os.path.join(os.path.dirname(__file__), '..', 'monitoring', 'dashboards', 'qa-automation.json')

# Ler o arquivo
with open(dashboard_path, 'r') as f:
    dashboard = json.load(f)

# Mapeamento de legendas para remover {{branch}} e usar textos mais claros
legend_replacements = {
    # Stat panels no resumo - remover branch
    "{{branch}}": "Atual",
    "Pass Rate - {{branch}}": "Taxa de Sucesso (%)",
    "Duration - {{branch}}": "Duracao (segundos)",
    # Inglês para Português
    "Passed": "Passou",
    "Failed": "Falhou", 
    "Skipped": "Ignorado",
    "Lines": "Linhas",
    "Functions": "Funcoes",
    # CI/CD - manter build e branch para histórico
    "Build #{{build}} - {{branch}}": "#{{build}} ({{branch}})",
}

changes = []

# Percorrer todos os painéis e atualizar legendFormat
for panel in dashboard['panels']:
    if 'targets' in panel:
        for target in panel['targets']:
            if 'legendFormat' in target:
                old_legend = target['legendFormat']
                if old_legend in legend_replacements:
                    new_legend = legend_replacements[old_legend]
                    target['legendFormat'] = new_legend
                    changes.append(f"  '{old_legend}' -> '{new_legend}'")
    
    # Atualizar overrides para cores em português
    if 'fieldConfig' in panel and 'overrides' in panel.get('fieldConfig', {}):
        for override in panel['fieldConfig'].get('overrides', []):
            if 'matcher' in override and 'options' in override['matcher']:
                opt = override['matcher']['options']
                if opt == 'Passed':
                    override['matcher']['options'] = 'Passou'
                    changes.append(f"  override 'Passed' -> 'Passou'")
                elif opt == 'Failed':
                    override['matcher']['options'] = 'Falhou'
                    changes.append(f"  override 'Failed' -> 'Falhou'")
                elif opt == 'Skipped':
                    override['matcher']['options'] = 'Ignorado'
                    changes.append(f"  override 'Skipped' -> 'Ignorado'")

# Atualizar versão
dashboard['version'] = 3

# Salvar
with open(dashboard_path, 'w') as f:
    json.dump(dashboard, f, indent=2, ensure_ascii=False)

print("Dashboard atualizado com sucesso!")
print(f"Total de alterações: {len(changes)}")
for change in changes[:10]:  # Mostrar apenas as primeiras 10
    print(change)
if len(changes) > 10:
    print(f"  ... e mais {len(changes) - 10} alterações")
