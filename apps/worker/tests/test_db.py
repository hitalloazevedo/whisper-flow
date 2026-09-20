from unittest.mock import MagicMock, patch

from worker import db


def make_conn():
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    return conn, cursor


def test_listen_for_new_jobs_issues_listen_on_the_channel():
    conn, cursor = make_conn()

    db.listen_for_new_jobs(conn)

    cursor.execute.assert_called_once_with(f"LISTEN {db.NEW_JOB_CHANNEL};")


@patch("worker.db.select.select")
def test_wait_for_notification_returns_false_on_timeout(select_mock):
    select_mock.return_value = ([], [], [])
    conn = MagicMock()

    received = db.wait_for_notification(conn, 5)

    assert received is False
    conn.poll.assert_not_called()


@patch("worker.db.select.select")
def test_wait_for_notification_drains_notifies_when_readable(select_mock):
    conn = MagicMock()
    select_mock.return_value = ([conn], [], [])

    def fake_poll():
        conn.notifies.extend(["job-inserted"])

    conn.notifies = []
    conn.poll.side_effect = fake_poll

    received = db.wait_for_notification(conn, 5)

    assert received is True
    conn.poll.assert_called_once()
    assert conn.notifies == []


@patch("worker.db.select.select")
def test_wait_for_notification_returns_false_when_readable_but_nothing_queued(select_mock):
    conn = MagicMock()
    conn.notifies = []
    select_mock.return_value = ([conn], [], [])

    received = db.wait_for_notification(conn, 5)

    assert received is False


def test_connect_enables_autocommit():
    with patch("worker.db.psycopg2.connect") as connect_mock:
        fake_conn = MagicMock()
        connect_mock.return_value = fake_conn

        conn = db.connect("postgresql://localhost/test")

        assert conn.autocommit is True
