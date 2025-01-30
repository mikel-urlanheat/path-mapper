// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';

interface CustomTerminalLink extends vscode.TerminalLink {
	data: string;
}

// 사용자가 Command 를 실행해서 Activate 할 때, 한번만 실행된다.
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "path-mapper" is now active!');

	// Command (여기서는 path-mapper.pathMapper) 는 package.json 파일에 정의를 해야한다. 그리고 그 commad 를 registerCommand 로 구현해야한다.
	// 그리고 사용자가 Command Palette 에서 실행할 때 마다, 여기서 등록된 함수가 실행된다.
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('path-mapper.pathMapper', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Path Mapper is installed!');
	});

	const workspaceFolder: string = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";


	const regex = /(https?:\/\/[^\s]+|(?:~|[a-zA-Z]:)?[\/\\](?:[^\/\\:\*\?<>\|"\s]+[\/\\])*[^\/\\:\*\?<>\|"\s]*(?::\d+)?|\.{0,2}[\/\\](?:[^\/\\:\*\?<>\|"\s]+[\/\\])*[^\/\\:\*\?<>\|"\s]*(?::\d+)?)/g;

	vscode.window.registerTerminalLinkProvider({
		provideTerminalLinks: (context: vscode.TerminalLinkContext, token: vscode.CancellationToken): any => {
			const matches = [...context.line.matchAll(regex)];

			// console.log('matches:', matches);

			return matches.map(match => ({

				startIndex: match.index,

				length: match[0].length,

				// Optional data to use in the handler

				data: match[0]

			}));
		},

		handleTerminalLink: async (link: CustomTerminalLink) => {
			// [link] is the link that was clicked
			// [link.data] is the data that was passed to the link when it was created
			// console.log('--> link:', link);
			// console.log('--> vscode.Uri.parse(link.data)', vscode.Uri.parse(link.data));
			// console.log('--> vscode.workspace:', vscode.workspace);
			// console.log('--> getAbsolutePath(link.data) :' + getAbsolutePath(link.data));

			let mapper: Array<{ match: string, replace: string }> = vscode.workspace.getConfiguration().get('path-mapper') ?? [];
			// console.log('workspaceFolder: ', workspaceFolder);
			// Resolve workspaceFolder variable
			mapper = mapper.map((e) => {
				return {
					match: e.match.replace(/\${workspaceFolder}/g, workspaceFolder),
					replace: e.replace.replace(/\${workspaceFolder}/g, workspaceFolder)
				};
			});

			// console.log('mapper[0]: ', mapper[0]);
			// console.log('mapper[1]: ', mapper[1]);
			let path = link.data;
			// console.log('path: ', path);

			const found: number = mapper.findIndex((e) => {
				// console.log('match: ', e.match);
				// return -1 if the path is not absoulte path
				if (path.indexOf('/') !== 0) {
					return -1;
				}
				return path.indexOf(e.match) > -1;
			});

			// console.log('found: ', found);
			let replaced: string = '';
			if (found === -1) {
				replaced = path;
			} else {
				const map = mapper[found];
				// console.log('map: ', map);
				// replace without regular expression
				// replaced = path.replace(map.match, map.replace);


				if (path.startsWith('/')) {
					// Remove leading slash from match if present
					const matchWithoutSlash = map.match.startsWith('/') ? map.match.substring(1) : map.match;
					// Remove leading slash from replace if present
					const replaceWithoutSlash = map.replace.startsWith('/') ? map.replace.substring(1) : map.replace;
					replaced = path.replace(matchWithoutSlash, replaceWithoutSlash);
				} else {
					replaced = path.replace(map.match, map.replace);
				}
			}
			// console.log('path: ' + path, 'replaced: ' + replaced, 'vscode.Uri.parse(replaced): ' + vscode.Uri.parse(replaced));
            openFileAtPosition(replaced);

		}
	});


	context.subscriptions.push(disposable);
}

// Open the file at the specified position if position is provided
const openFileAtPosition = (replaced: string) => {
    // Regular expression to match the file path and position
    const match = replaced.match(/^(?!(?!file:\/\/)[a-zA-Z]+:\/\/)(.+?)(?::(\d+)|\((\d+)\))?$/);

    if (match) {
        const filePath = match[1];
        const position = match[2] || match[3];

        if (position) {
            const line = parseInt(position, 10) - 1; // Adjust line for VSCode (0-indexed)
            const uri = vscode.Uri.file(filePath);
            const options = {
                selection: new vscode.Range(line, 0, line, 0), // Initial line and character selection
            };
            return vscode.commands.executeCommand('vscode.open', uri, options);
        }
    }
    return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(replaced));
};

// Generate an absolute path from a relative path
function getAbsolutePath(fileUri: string) {
	// Get the current workspace folder
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

	// If there is no workspace folder, return the original path
	if (!workspaceFolder) {
		return fileUri;
	}

	// Get the absolute path of the file
	const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, fileUri).fsPath;

	return absolutePath;
}

// This method is called when your extension is deactivated
export function deactivate() { }
