# build environment variables
- $env:OPENAI_API_BASE="https://generativelanguage.googleapis.com/v1beta/openai/"
- $env:GEMINI_API_KEY="<your api key here>"
- $env:OPENAI_API_KEY=$env:GEMINI_API_KEY

# install github cli
- support aider read issue
- gh view issue 1

# run aider
- .\run-task.ps1 <issue number> [-NoTest] (issue number may be: 1, 2, .. in the github)
