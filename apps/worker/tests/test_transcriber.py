from unittest.mock import MagicMock, patch

from worker.transcriber import Transcriber


def make_segment(text):
    segment = MagicMock()
    segment.text = text
    return segment


@patch("worker.transcriber.WhisperModel")
def test_joins_and_trims_segments(whisper_model_cls):
    model_instance = whisper_model_cls.return_value
    model_instance.transcribe.return_value = (
        [make_segment(" Hello"), make_segment(" world.")],
        object(),
    )

    transcriber = Transcriber("base", "cpu", "int8")
    result = transcriber.transcribe("audio.mp3")

    assert result == "Hello world."
    model_instance.transcribe.assert_called_once_with("audio.mp3")


@patch("worker.transcriber.WhisperModel")
def test_constructs_model_with_given_settings(whisper_model_cls):
    Transcriber("small", "cuda", "float16")

    whisper_model_cls.assert_called_once_with("small", device="cuda", compute_type="float16")
