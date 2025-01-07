
# Audio to text transcriber

Transcriber created in Python with the WhisperAI library.

This project is using the `small` model, which uses 244 million parameters.

The transcriber can handle the following audio extensions: `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm`.

## How to run

### Requirements (Installing ffmpeg with chocolatey) (Windows)
- [Python](https://www.python.org/) version >= 3.10
- Install [chocolatey](https://docs.chocolatey.org/en-us/choco/setup)
- Run `choco install ffmpeg`
- Run `setx /m PATH "<ffmpeg path>"` In my case, the path was                             `C:\ProgramData\chocolatey\lib\ffmpeg\tools\ffmpeg\bin`)

Cloning the project

```bash
  git clone https://github.com/hitalloazevedo/whisper-flow
```

Opening the directory
```bash
  cd whisper-flow
```

Setting up python environment
##### Windows
```bash
  python -m venv venv
```
Cmd
```cmd
  .\venv\Scripts\activate.bat
```

Powershell
```cmd
  .\venv\Scripts\Activate.ps1
```

##### Linux
```bash
  python3 -m venv venv
```
```bash
  source venv/bin/activate
```



- To transcribe the audios, the files must be in the `/audios` folder.

Installing the requirements
```bash
  pip install -r requirements.txt
```

Running
##### Windows
```bash
  python transcriber.py
```
##### Linux
```bash
  python3 transcriber.py
```

Checking results
 - After running `Whisper Flow`, you can find your transcrip in the `/output/<filename.txt>` folder.





## Techstack

- Python3
- Whisper AI



## Authors

- [@Hitallo Azevedo](https://github.com/hitalloazevedo)

