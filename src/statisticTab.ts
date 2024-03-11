
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import {
    EVENT_NAMES_TO_STATISTIC,
    EVENT_NAMES_FROM_STATISTIC,
    SetStatisticsHash,
  } from "refact-chat-js/dist/events";
import * as fetchAPI from "./fetchAPI";
import { v4 as uuidv4 } from "uuid";
import {secret_api_key} from './userLogin';
import { createHash } from "crypto";

export class StatisticTab {
    private _disposables: vscode.Disposable[] = [];
    public constructor(
        public web_panel: vscode.WebviewPanel | vscode.WebviewView,
    ) {
        this.handleEvents = this.handleEvents.bind(this);
        this.web_panel.webview.onDidReceiveMessage(this.handleEvents);
    }

    private handleEvents(message: any) {
        switch (message.type) {
          case EVENT_NAMES_TO_STATISTIC.REQUEST_STATISTIC_DATA: {
            return fetchAPI
              .get_statistic_data()
              .then((data) => {
                return this.web_panel.webview.postMessage({
                  type: EVENT_NAMES_TO_STATISTIC.RECEIVE_STATISTIC_DATA,
                  payload: data,
                });
              })
              .catch((err) => {
                return this.web_panel.webview.postMessage({
                  type: EVENT_NAMES_TO_STATISTIC.RECEIVE_STATISTIC_DATA_ERROR,
                  payload: {
                    message: err,
                  },
                });
              });
          }

          case EVENT_NAMES_FROM_STATISTIC.READY: {
            const message: SetStatisticsHash = {
              type: EVENT_NAMES_TO_STATISTIC.SET_STATISTIC_HASH,
              payload: { data: this.createStatisticsHash() }
            };

            this.web_panel.webview.postMessage(message);
          }

        }
    }

    dispose() {
        this._disposables.forEach((d) => d.dispose());
    }

    createStatisticsHash() {
        const sessionId = vscode.env.sessionId;
        const apiKey = secret_api_key();
        const hash = createHash("md5").update(apiKey + sessionId).digest("hex");
        return hash;
    }

    public get_html_for_statistic(
        webview: vscode.Webview,
        extensionUri: any,
        isTab = false
    ): string {
        const nonce = uuidv4();

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, "node_modules", "refact-chat-js", "dist", "chat", "index.umd.cjs")
        );

        const styleMainUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, "node_modules", "refact-chat-js", "dist", "chat", "style.css")
        );

        const styleOverride = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, "assets", "custom-theme.css")
        );

        return `<!DOCTYPE html>
            <html lang="en" class="light">
            <head>
                <meta charset="UTF-8">
                <!--
                    Use a content security policy to only allow loading images from https or from our extension directory,
                    and only allow scripts that have a specific nonce.
                    TODO: remove  unsafe-inline if posable
                -->
                <meta http-equiv="Content-Security-Policy" script-src 'nonce-${nonce}'; style-src-attr 'sha256-tQhKwS01F0Bsw/EwspVgMAqfidY8gpn/+DKLIxQ65hg=' 'unsafe-hashes';">
                <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">

                <title>Refact.ai Chat</title>
                <link href="${styleMainUri}" rel="stylesheet">
                <link href="${styleOverride}" rel="stylesheet">
            </head>
            <body>
                <div id="refact-statistic"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>

                <script nonce="${nonce}">
                window.onload = function() {
                    const root = document.getElementById("refact-statistic")
                    RefactChat.renderStatistic(root, {host: "vscode", tabbed: ${isTab} });
                }
                </script>
            </body>
            </html>`;
    }
}

