# MyCroft

Track and log your coding activities directly to GitHub from VS Code. MyCroft helps developers maintain a comprehensive record of their work by automatically syncing activities to a dedicated repository.

## Features

- **GitHub Integration**: Automatically sync activities to your GitHub repository
- **Activity Tracking**: Log coding tasks, achievements, and milestones
- **Visual Dashboard**: Monitor progress through an intuitive sidebar interface
- **Custom Categories**: Organize activities with tags and categories
- **Automated Syncing**: Seamless GitHub repository integration

## Setup

1. Install the extension
2. Configure GitHub settings:
   - Add GitHub Personal Access Token
   - Set repository name for activity storage
3. Run `MyCroft: Initialize Activity Tracking Repository`

## Configuration

This extension requires:

- GitHub Personal Access Token with repo permissions
- VS Code version 1.96.0 or higher

Settings:

```json
{
  "mycroft.githubToken": "your-github-token",
  "mycroft.repositoryName": "your-activity-repo"
}
```

## Usage

1. Open MyCroft sidebar (activity bar icon)
2. Use the Activity Logger to record your work
3. Activities automatically sync to GitHub

## Commands

- `MyCroft: Initialize Activity Tracking Repository`: Set up GitHub tracking

## Known Issues

- Initial GitHub repository setup required before logging activities
- Token validation may timeout on slow connections

## Release Notes

### 1.0.0

- Initial release
- GitHub integration
- Activity logging dashboard
- Automatic syncing
- Custom activity categories
  
### 1.1.0

- Enhanced UI for the activity logger sidebar
- Improved visual dashboard for monitoring progress
- Minor bug fixes and performance improvements

## Requirements

- GitHub account
- Personal Access Token
- Node.js for extension development

## License

MIT

## Contributing

Issues and pull requests welcome on [GitHub](https://github.com/IshKevin/MyCroft.git).



