from functions import filterValidFilenames, mapFilenames, saveToDisk, transcribe, getOutputFilePath, getAudioFilePath
from interface import clearTerminal, showHeader, showOptions, getFileId, drawLine, showProgressMessage, colors

def main():
    # create a list of valid audio filenames.
    validFilenames = filterValidFilenames()

    # map the filenames into a dictionary, giving each one an ID.
    filesMap = mapFilenames(validFilenames)

    clearTerminal()
    showHeader()
    showOptions(filesMap)

    # get the file ID choosen by the user
    fileId = getFileId(len(filesMap))

    # handle file paths definitions
    audioFilename = filesMap[fileId][1]
    audioFilePath = getAudioFilePath(audioFilename)
    outputFilePath = getOutputFilePath(audioFilename)

    drawLine(50)

    showProgressMessage('transcription initialized. Please wait...')

    print(f'{colors.yellow()}Note: if it\'s your first time executing the application, the model download is required. Please, be patient.{colors.regular()}')

    # transcribe the audio to text using WhisperAI
    transcribed_text = transcribe(audioFilePath)

    showProgressMessage('transcription finalized. Saving results...')

    # save the transcription in the /outputs directory
    saveToDisk(transcribed_text, outputFilePath)

    showProgressMessage(f'transcription done! You can check the results in {colors.cyan()}{outputFilePath}{colors.regular()}')

if __name__ == '__main__':
    main()