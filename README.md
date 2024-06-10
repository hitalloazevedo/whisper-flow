
# Conversor de aúdio/vídeo para texto

Conversor construído em python utilizando a biblioteca whisper, disponibilizada pela openAI.

Esta versão do meu projeto, esta utilizando o modelo `small` que trabalha com 244 Milhões de parâmetros.

Este conversor é capaz de extrair o texto (transcrição) dos seguintes formatos de arquivos: `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm`.







## Utilizando localmente

### Requisitos (Instalando ffmpeg com chocolatey)
- [Python](https://www.python.org/) versão >= 3
- Instalar [chocolatey](https://docs.chocolatey.org/en-us/choco/setup)
- Executar o comando `choco install ffmpeg`
- Executar o comando `setx /m PATH "<Caminho do ffmpeg >"` No meu caso, instalando com o chocolatey o caminho foi                             `C:\ProgramData\chocolatey\lib\ffmpeg\tools\ffmpeg\bin`)

Clonando o projeto

```bash
  git clone https://github.com/hitalloazevedo/audio-text-converter
```

abrindo o diretório 

```bash
  cd audio-text-converter
```

Configurando 

- dentro do diretório `audio-text-converter`, criar uma pasta chamada `audios` os arquivos que serão convertidos, devem ser movidos para dentro desse diretório!

Instalando requisitos
```bash
  pip install -r requirements.txt
```

Executando

```bash
  python transcriber.py
```

Resultado
 - Após a transcrição, seu texto pode ser conferido em `/output/<nome_do_arquivo.txt>`





## Tecnologias

- Python
- Whisper AI



## Authors

- [@Hitallo Azevedo](https://github.com/hitalloazevedo)

