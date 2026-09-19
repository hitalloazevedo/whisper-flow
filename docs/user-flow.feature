Feature: Transcription workspace
  As a person with an audio recording
  I want to securely submit it for transcription
  So that I can read the resulting transcript in my workspace

  Background:
    Given the transcription workspace is available

  Scenario: A visitor sees the sign-in entry point
    Given I am not authenticated
    When I open the transcription workspace
    Then I should see the "Continue with Google" action
    And I should not see another user's transcription library

  Scenario: A visitor signs in with Google
    Given I am not authenticated
    And I am on the sign-in screen
    When I choose "Continue with Google"
    And Google completes authentication successfully
    Then I should return to the transcription workspace
    And I should see my profile identity
    And I should see the new transcription upload area
    And I should see only my transcription library

  Scenario: A visitor cancels Google authentication
    Given I am not authenticated
    And I am on the sign-in screen
    When I choose "Continue with Google"
    And I cancel authentication at Google
    Then I should return to the sign-in screen
    And I should see an authentication cancellation message
    And no user account should be created

  Scenario: An authenticated user uploads a supported audio file
    Given I am authenticated
    And I am viewing my transcription workspace
    When I choose a supported audio file named "customer-interview.m4a"
    And the upload completes successfully
    Then I should see a new transcription job for "customer-interview.m4a"
    And the job should have a "processing" status
    And the job should appear at the top of my recent transcriptions

  Scenario: An authenticated user starts an upload from the drop zone
    Given I am authenticated
    And I am viewing my transcription workspace
    When I drop a supported audio file onto the upload area
    Then the file should begin uploading
    And I should see upload progress
    And the upload area should not submit the file twice

  Scenario: An unsupported file is rejected
    Given I am authenticated
    And I am viewing my transcription workspace
    When I choose a file with an unsupported format
    Then I should see a clear unsupported-file error
    And no transcription job should be created
    And I should be able to choose another file

  Scenario: An oversized file is rejected
    Given I am authenticated
    And I am viewing my transcription workspace
    When I choose an audio file larger than the allowed limit
    Then I should see a clear file-size error
    And no transcription job should be created

  Scenario: A user watches a job move from processing to completed
    Given I am authenticated
    And I have a transcription job with a "processing" status
    When transcription finishes successfully
    Then the job should have a "completed" status
    And I should be able to open the transcript
    And the transcript should belong to my account

  Scenario: A user sees that a transcription failed
    Given I am authenticated
    And I have a transcription job with a "processing" status
    When transcription fails
    Then the job should have a "failed" status
    And I should see a useful failure message
    And I should have an option to retry the transcription

  Scenario: A user opens a completed transcript
    Given I am authenticated
    And I have a completed transcription for "customer-interview.m4a"
    When I open the transcription
    Then I should see the transcript text
    And I should see the original filename
    And I should see when the transcription was created
    And I should be able to download the transcript

  Scenario: A user cannot access another user's transcription
    Given I am authenticated as "user-a"
    And "user-b" owns a completed transcription
    When I request "user-b"'s transcription
    Then I should receive an access denied response
    And I should not see the transcript text

  Scenario: A user signs out
    Given I am authenticated
    And I am viewing my transcription workspace
    When I sign out
    Then my session should be ended
    And I should return to the sign-in screen
    And I should not be able to open my transcription library without signing in again
