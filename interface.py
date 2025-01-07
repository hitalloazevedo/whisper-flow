from os import name, system

class Colors:
    def __init__(self):
        pass

    def red(self):
        return '\033[31m'
    
    def green(self):
        return '\033[32m'
    
    def regular(self):
        return '\033[m'
    
    def cyan(self):
        return '\033[36m'
    
    def yellow(self):
        return '\033[33m'
    
colors = Colors()

def drawLine(length: int, char: str = '='):
    print(char * length)

def drawPlus(color: str):
    '''
        "red", "green"
    '''
    match color:
        case "green":
            return f'[{colors.green()}+{colors.regular()}]'
        case "red":
            return f'[{colors.red()}+{colors.regular()}]'
        case _:
            return ''

def clearTerminal():
    if name == 'nt':
        system('cls')
    else:
        system('clear')

def showHeader():
    print('Welcome to the Whisper Flow.'.center(50))
    print('v0.0.2, developed by \033[32mHitallo Azevedo\033[m'.center(58))
    drawLine(50)
    print("Please, select the audio you want to transcribe.".center(50))

def showOptions(file_mapping):
    for file in file_mapping:
        print(f' [{colors.cyan()}{file[0]}{colors.regular()}] - {colors.cyan()}{file[1]}{colors.regular()}')

def getFileId(filesCount):
    id = int(input(" Enter file ID: "))

    if id < 0 or id > filesCount - 1:
        print(f"{drawPlus('red')} Please choice an valid ID.")
        exit(1)

    return id

def showProgressMessage(message: str):
    print(f'{drawPlus("green")} {message}')
