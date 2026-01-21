# End-to-End (E2E) Tests

Este diretório contém testes E2E em **dois ambientes**:

## 📦 Arquivos

```
__tests__/e2e/
├── local.test.js         # E2E contra localhost (desenvolvimento)
├── remote.test.js        # E2E contra produção (https://abnerfonseca.com.br/api)
├── e2e-remote-report.json # Relatório JSON do último teste remoto
└── reports/              # Histórico de execuções remotas (max 30)
    ├── e2e-remote-2025-01-19T14-30-00-000Z.json
    ├── e2e-remote-2025-01-19T15-00-00-000Z.json
    └── ...
```

## 🎯 Quando usar cada um?

### Local E2E ([local.test.js](local.test.js))

**Propósito**: Validar backend localmente antes de commit/push

```bash
npm run test:e2e:local
```

✅ **Características**:
- Roda contra `localhost:3000`
- Usa `supertest` (sem rede, in-process)
- Rápido (~3.6s)
- 13 testes completos
- **92.3% de cobertura**
- Desabilita mocks JWT (`jest.unmock('jsonwebtoken')`)

📊 **Cobertura**:
- Authentication (token generation, validation, 401 errors)
- Full workflow (POST → polling → PROCESSED)
- Error handling (404, QUEUED status)
- Payload validation (large payloads, empty messages)
- Metrics endpoint
- Concurrency (5 simultaneous requests)
- Rate limiting (100 req/min)
- Token expiration (5s)

### Remote E2E ([remote.test.js](remote.test.js))

**Propósito**: Monitorar API em produção após deploy

```bash
npm run test:e2e:remote        # Roda e gera relatório JSON
npm run test:e2e:remote:save   # Roda + salva no histórico + compara
npm run test:e2e:compare       # Compara últimos 2 relatórios
```

✅ **Características**:
- Roda contra `https://abnerfonseca.com.br/api`
- Usa `axios` (HTTP real)
- Mais lento (~8s devido à rede)
- 6 testes essenciais
- Gera relatório JSON
- Mantém histórico de 30 execuções
- Usado em CI/CD nightly

📊 **Cobertura**:
- Authentication (token generation)
- Full workflow (POST → polling → PROCESSED)
- Error handling (401 unauthorized, 404 not found)
- Payload validation (>500 chars rejection)
- Metrics endpoint

## 🔄 Comparação Lado a Lado

| Aspecto | Local | Remoto |
|---------|-------|--------|
| **Ambiente** | localhost:3000 | abnerfonseca.com.br/api |
| **Tecnologia** | supertest | axios |
| **Velocidade** | ~3.6s | ~8s |
| **Testes** | 13 | 6 |
| **Uso** | Desenvolvimento | Produção |
| **CI/CD** | Per-commit (ci.yml) | Nightly (e2e-remote.yml) |
| **Mocks** | Desabilitados | N/A |
| **Relatórios** | Não salva | JSON + histórico |

## 🏃 Como Executar

### Durante Desenvolvimento

```bash
# Antes de commit
npm run test:e2e:local

# Se passar, commit com confiança!
git add .
git commit -m "feature: nova funcionalidade"
```

### Após Deploy

```bash
# Validar produção manualmente
npm run test:e2e:remote:save

# Ver comparação com execução anterior
npm run test:e2e:compare
```

### Executar Tudo

```bash
# Local + Remoto (sequencial)
npm run test:e2e:all
```

## 📊 Relatórios Remotos

### Estrutura JSON

```json
{
  "numFailedTestSuites": 0,
  "numFailedTests": 0,
  "numPassedTestSuites": 1,
  "numPassedTests": 6,
  "numTotalTests": 6,
  "success": true,
  "startTime": 1737298800000,
  "testResults": [
    {
      "name": "__tests__/e2e/remote.test.js",
      "status": "passed",
      "startTime": 1737298800500,
      "endTime": 1737298808676,
      "assertionResults": [
        {
          "title": "deve gerar token válido via POST /auth/token",
          "status": "passed",
          "duration": 853
        }
      ]
    }
  ]
}
```

### Comparação de Relatórios

```bash
npm run test:e2e:compare
```

Output:
```
📊 Comparação de Relatórios E2E

📅 Execução Anterior: 2025-01-19T14:30:00.000Z
✅ Passou: 6/6 (100%)
⏱️  Duração: 8.176s

📅 Execução Atual: 2025-01-19T15:00:00.000Z
✅ Passou: 6/6 (100%)
⏱️  Duração: 7.938s

🔍 Análise:
✓ Taxa de sucesso mantida: 100%
✓ Duração melhorou: -238ms (-2.9%)
```

## 🧪 Exemplos de Testes

### Local: Async Polling Pattern

```javascript
it('fluxo completo: token → POST /logs → polling até PROCESSED', async () => {
  // 1. Gerar token
  const tokenRes = await request(app)
    .post('/auth/token')
    .send({})
    .expect(200);

  const token = tokenRes.body.token;

  // 2. Enviar log
  const postRes = await request(app)
    .post('/logs')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'Test message' })
    .expect(202);

  const correlationId = postRes.body.correlationId;

  // 3. Polling até processar
  let status = 'QUEUED';
  let attempts = 0;

  while (status === 'QUEUED' && attempts < 10) {
    await new Promise(r => setTimeout(r, 500));

    const statusRes = await request(app)
      .get(`/logs/${correlationId}`)
      .expect(200);

    status = statusRes.body.status;
    attempts++;
  }

  // 4. Validar resultado
  expect(['PROCESSED', 'FAILED']).toContain(status);
}, 10000);
```

### Remoto: Network Resilience

```javascript
it('fluxo completo: token → POST /logs → polling até PROCESSED', async () => {
  // 1. Gerar token
  const tokenRes = await axios.post(`${API_BASE}/auth/token`, {});
  expect(tokenRes.status).toBe(200);

  const token = tokenRes.data.token;

  // 2. Enviar log
  const postRes = await axios.post(
    `${API_BASE}/logs`,
    { message: 'Remote E2E test log' },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  expect(postRes.status).toBe(202);
  const correlationId = postRes.data.correlationId;

  // 3. Polling com timeout de rede
  const maxAttempts = 15;
  let status = 'QUEUED';
  let attempts = 0;

  while (status === 'QUEUED' && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 1000)); // Mais tempo por rede

    const statusRes = await axios.get(`${API_BASE}/logs/${correlationId}`);
    status = statusRes.data.status;
    attempts++;
  }

  expect(['PROCESSED', 'FAILED']).toContain(status);
}, 20000); // Timeout maior para rede
```

## 🔧 Configuração

### Variáveis de Ambiente

#### Local
```bash
# Nenhuma variável necessária
# Usa configuração padrão do index.js
```

#### Remoto
```bash
# package.json
"test:e2e:remote": "API_BASE=https://abnerfonseca.com.br/api jest ..."
```

### Jest Config Específica

```javascript
// jest.config.js (se necessário ajustar)
{
  testTimeout: 10000, // Local: 10s suficiente
  // testTimeout: 20000, // Remoto: 20s por rede
}
```

## 🚀 CI/CD Integration

### Per-Commit (Local)

```yaml
# .github/workflows/ci.yml
- name: Run E2E Local Tests
  run: npm run test:e2e:local
```

### Nightly (Remoto)

```yaml
# .github/workflows/e2e-remote.yml
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM UTC diariamente
  workflow_dispatch: # Manual trigger

jobs:
  e2e-remote:
    runs-on: ubuntu-latest
    steps:
      - name: Run Remote E2E & Save Report
        run: npm run test:e2e:remote:save

      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: e2e-remote-reports
          path: __tests__/e2e/reports/
```

## 📈 Métricas

### Local E2E

```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Time:        3.62 s

Coverage:
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |    92.3 |    80.76 |   85.71 |   92.06 |
 index.js |    92.3 |    80.76 |   85.71 |   92.06 | 44,65-66,114-115
----------|---------|----------|---------|---------|-------------------
```

### Remoto E2E

```
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Time:        8.176 s
```

## 🛠️ Troubleshooting

### Local: Rate Limit (429)

**Problema**: Muitas requisições em sequência

**Solução**: O teste detecta e pula automaticamente
```javascript
if (tokenRes.status === 429) {
  console.log('⚠️  Rate limit atingido - pulando teste');
  return;
}
```

### Remoto: Network Timeout

**Problema**: API lenta ou indisponível

**Solução**: Aumentar timeout no teste
```javascript
it('test name', async () => {
  // ...
}, 30000); // 30 segundos
```

### Local: JWT Mock Interferindo

**Problema**: Token vazio `{}`

**Solução**: `jest.unmock('jsonwebtoken')` já está no arquivo

## 📚 Documentação Relacionada

- [TESTES_E2E_LOCAL.md](../../doc/TESTES_E2E_LOCAL.md) - Guia detalhado local
- [E2E_EXPLICADO_SIMPLES.md](../../doc/E2E_EXPLICADO_SIMPLES.md) - Conceito E2E
- [LOCAL_VS_REMOTO_SIMPLES.md](../../doc/LOCAL_VS_REMOTO_SIMPLES.md) - Comparação visual
- [RELATORIOS_DADOS_GUIA.md](../../doc/RELATORIOS_DADOS_GUIA.md) - Sistema de relatórios

## ✅ Checklist Antes de Commit

- [ ] `npm run test:e2e:local` passa ✅
- [ ] Cobertura mantida > 90%
- [ ] Nenhum teste flakey
- [ ] Rate limit respeitado

## ✅ Checklist Pós-Deploy

- [ ] `npm run test:e2e:remote:save` passa ✅
- [ ] Comparação com execução anterior sem degradação
- [ ] Todos os 6 testes remotos verdes
- [ ] Latência similar à baseline

---

**Resumo**:
- **Local**: 13 testes, 3.6s, desenvolvimento
- **Remoto**: 6 testes, 8s, produção
- **Ambos**: Async polling, JWT real, cobertura completa
