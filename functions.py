import os
import whisper

validExtensions = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']

def filterValidFilenames():
   return [filename for filename in os.listdir('audios') if itHasValidFileExtension(filename)]

def mapFilenames(filenames):
    return [(index, filename) for index, filename in enumerate(filenames)]

def saveToDisk(content: str, path: str):
    if 'outputs' not in os.listdir():
        os.mkdir('outputs')

    with open(path,'wt+', encoding='utf-8') as file:
        file.write(content)

def getOutputFilePath(audioFilename):
    outputFilename = audioFilename.split('.')[0] + '.txt'
    return os.path.join('outputs', outputFilename)

def getAudioFilePath(audioFilename):
    return os.path.join('audios', audioFilename)

def transcribe(audioFilePath):
    model = whisper.load_model('small')
    result = model.transcribe(audioFilePath)
    return result['text']

def itHasValidFileExtension(filename):
    extension = filename.split('.')[-1]
    return extension in validExtensions


