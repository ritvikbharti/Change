import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import {getQueryResult} from "./queryReq";
import { exec } from 'child_process';
import { promisify } from 'util';

export function activate(context: vscode.ExtensionContext) {
    const createFilesCommand = vscode.commands.registerCommand('jsonFileCreator.createFiles', async () => {
        var query = await vscode.window.showInputBox({ prompt: 'Enter your query' });

        if (query) {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Fetching data...",
                    cancellable: false
                },
                async (progress, token) => {
                    try {
                        query = query+ " return the change in the Given Styled Json Format [{fileName:'someFilename.js',content:'thefullfilecontent',shellScript:'some Commands to run'}] also Generate each files As Given in Query ... Only Provide Json File No Thing ELSE";
                        vscode.window.showWarningMessage(query);
                        var returnVal = await getQueryResult(query,"66e4ad559b3af8875a1f62ab");
                        vscode.window.showWarningMessage(`${JSON.stringify(returnVal)}`);
                        processFiles(returnVal);
                        
                    } catch (error) {
                        vscode.window.showErrorMessage(`Error: ${error}`);
                    }
                }
            );
        }
    });

    context.subscriptions.push(createFilesCommand);
}

async function processFiles(query:any) {
    try {
     
        if (Array.isArray(query)) {
            for (const item of query) {

                const action = await vscode.window.showInformationMessage(
                    `File: ${item.fileName}\nContent: ${item.content}`,
                    { modal: true },
                    'Apply', 'Cancel'
                );

                if (action === 'Apply') {
                    await createFiles(item);
                } else {
                    vscode.window.showWarningMessage("file not Selected");
                }
            }
        } else {
            vscode.window.showErrorMessage('Invalid query result. Expected an array.');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
    }
}



const execPromise = promisify(exec);

async function createFiles(fileData: { fileName: string, content: string }) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspaceFolder) {
        const filePath = path.join(workspaceFolder, fileData.fileName);
        fs.writeFile(filePath, fileData.content, async (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to create file ${fileData.fileName}: ${err.message}`);
                return;
            }
            vscode.window.showInformationMessage(`File ${fileData.fileName} created successfully.`);
            if (path.extname(fileData.fileName) === '.sh') {
                try {
                    await execPromise(`sh ${filePath}`);
                    const { stdout, stderr } = await execPromise(filePath);
                    if (stdout) {
                        vscode.window.showInformationMessage(`Script output: ${stdout}`);
                    }
                    if (stderr) {
                        vscode.window.showErrorMessage(`Script error: ${stderr}`);
                    }
                } catch (execErr) {
                    vscode.window.showErrorMessage(`Failed to execute shell script: ${execErr}`);
                }
            }
        });
    } else {
        vscode.window.showErrorMessage('No workspace folder found.');
    }
}