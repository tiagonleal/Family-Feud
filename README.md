# 🎮 Family Feud - Edição Familiar

Um jogo Family Feud completo para jogar com a família, com visual clássico do programa!

## 🚀 Como Usar

### 1. Abrir o Jogo
- Abre o ficheiro `index.html` num browser (Chrome, Firefox, Edge)
- Recomendado: Chrome para melhor compatibilidade com áudio

### 2. Criar Perguntas
1. No menu principal, clica em **"Editor de Perguntas"**
2. Clica em **"+ Nova"** para criar uma pergunta
3. Escreve a pergunta e até 8 respostas com pontos
4. As respostas são ordenadas automaticamente por pontuação
5. Tudo é guardado automaticamente!

> 💡 **Dica:** Importa o ficheiro `questions_example.json` para teres perguntas de exemplo!

### 3. Iniciar um Jogo
1. Clica em **"Novo Jogo"**
2. Escolhe o número de equipas (2-4)
3. Define os nomes das equipas e jogadores
4. Configura o número de rondas (normais e duplas)
5. Define o tempo do timer
6. Clica **"Iniciar Jogo"**

### 4. Durante o Jogo

#### No teu PC (Painel de Controlo):
- Vês todas as respostas e podes clicar para revelar
- Usa o campo de texto para registar respostas erradas
- Botão grande **"✕ ERRO"** para dar strikes
- Controla o timer, power-ups e mudança de equipas

#### No Ecrã Grande (Display):
- Mostra o visual clássico do Family Feud
- Respostas aparecem com animações
- Strikes aparecem em grande
- Pontuação sempre visível

## ⌨️ Atalhos de Teclado (Painel de Controlo)

| Tecla | Ação |
|-------|------|
| `1-8` | Revela a resposta correspondente |
| `Espaço` | Adiciona strike |
| `P` | Pausar/Continuar jogo |
| `T` | Iniciar/Parar timer |
| `N` | Próxima ronda |
| `F11` | Ecrã inteiro (no Display) |

## 🎯 Power-ups

Cada equipa tem 2 power-ups (uma vez por jogo):

- **🔄 Passar Vez** - Passa a vez para a próxima equipa
- **➕ Resposta Extra** - Remove um strike e dá mais uma tentativa

## 📁 Estrutura de Ficheiros

```
Family Feud/
├── index.html          # Menu principal
├── editor.html         # Editor de perguntas
├── host.html           # Painel de controlo (teu ecrã)
├── display.html        # Display do jogo (ecrã grande)
├── css/                # Estilos
├── js/                 # Lógica do jogo
└── questions_example.json  # Perguntas de exemplo
```

## 💾 Dados

- **Perguntas**: Guardadas no `localStorage` do browser
- **Exportar**: Usa o botão "Exportar" no editor para fazer backup
- **Importar**: Podes importar um ficheiro `.json` com perguntas

## 🔧 Requisitos

- Browser moderno (Chrome, Firefox, Edge)
- Dois ecrãs (recomendado): um para ti, outro para a família ver
- Funciona 100% offline!

## 🎵 Sons

O jogo inclui efeitos sonoros gerados automaticamente:
- ✅ Ding - Resposta correta
- ❌ Buzzer - Resposta errada
- ⏱️ Tick - Timer a acabar
- 🎉 Vitória - Fim do jogo

## 📝 Dicas

1. **Face-off**: No início de cada ronda, duas pessoas tentam adivinhar a resposta #1
2. **3 Strikes**: A outra equipa pode roubar com UMA resposta correta
3. **Rondas Duplas**: Valem o dobro dos pontos - usa no fim!
4. **Timer**: Ajuda a manter o ritmo do jogo

---

Divirtam-se! 🎉
