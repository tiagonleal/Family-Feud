# 🎮 Family Feud - Como Jogar

## Forma Rápida (Abrir Ficheiro)

1. Abre a pasta `Family Feud`
2. Click duplo em `index.html`
3. O jogo abre no browser

---

## Forma Recomendada (Servidor Local)

### Windows
1. Click duplo em `run.bat`
2. Abre `http://localhost:8000` no browser
3. Clica em **Novo Jogo** ou **Continuar**

### Mac/Linux
```bash
./run.sh
```
Depois abre `http://localhost:8000` no browser

---

## Como Jogar

### Passo 1: Menu Principal
- **Novo Jogo** → Configura equipas e rondas
- **Editor de Perguntas** → Adiciona/edita perguntas
- **Continuar** → Retoma jogo anterior (se existir)

### Passo 2: Configurar Jogo
- Seleciona **2-4 equipas**
- Adiciona **nomes de equipas** e **jogadores**
- Define **número de rondas normais** e **duplas**
- Ajusta **tempo** (5-120 segundos)
- Clica **Iniciar Jogo**

### Passo 3: Durante o Jogo

**Host (Painel de Controlo):**
- 🖱️ Clica nas respostas para revelar
- ✕ Adiciona strikes por respostas erradas
- ⏱️ Controla o temporizador
- 🏴‍☠️ Ativa modo roubar após 3 strikes
- ⏸️ Pausa/retoma o jogo
- 🏁 Termina o jogo

**Display (Ecrã Grande):**
- Mostra as respostas reveladas
- Mostra pontuação e strikes
- Mostra temporizador
- Mostra vencedor no final

---

## Atalhos de Teclado

### Editor de Perguntas
- `Ctrl+N` → Nova pergunta
- `Ctrl+S` → Guardar (automático)
- `Delete` → Eliminar pergunta

### Host (Painel de Controlo)
- `Space` → Pausa/Retoma
- `Ctrl+Q` → Nova pergunta (debug)

---

## Requisitos

- **Browser moderno** (Chrome, Firefox, Safari, Edge)
- **Python 3** (opcional, para servidor) ou **Node.js**
- **Sem internet necessária** - tudo funciona offline!

---

## Primeira Utilização

1. Abre **Editor de Perguntas**
2. Adiciona algumas perguntas com respostas
3. Volta ao **Menu Principal**
4. Clica **Novo Jogo**
5. Configura as equipas
6. Clica **Iniciar Jogo**
7. Abre **Host** em `http://localhost:8000/host.html`
8. Abre **Display** em `http://localhost:8000/display.html` (noutra janela/monitor)

---

## Dicas

- ✅ **Dual Monitor**: Host no PC 1, Display no TV/Monitor 2
- ✅ **Fullscreen**: Pressiona `F11` para fullscreen no Display
- ✅ **Offline**: Sem internet? Sem problema! Tudo funciona localmente
- ✅ **Backup**: As perguntas são guardadas automaticamente no browser

---

## Troubleshooting

### "Nenhum jogo ativo encontrado"
→ Clica **Novo Jogo** no Menu Principal

### "Perguntas insuficientes"
→ Vai ao **Editor de Perguntas** e adiciona mais

### Som não funciona
→ Clica no jogo primeiro (browser requer interação)

### Duas janelas não sincronizam
→ Certifica-te que ambas estão no mesmo servidor (`localhost:8000`)

---

**Desenvolvido com ❤️ em Vanilla JavaScript**
