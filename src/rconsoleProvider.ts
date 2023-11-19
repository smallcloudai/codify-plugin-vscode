/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as estate from "./estate";
import * as rconsoleHints from "./rconsoleHints";
import * as sidebar from "./sidebar";
import * as chatTab from "./chatTab";


class MyCommentAuthorInformation implements vscode.CommentAuthorInformation {
    name: string;
    iconPath?: vscode.Uri;
    constructor(name: string, iconPath?: vscode.Uri) {
        this.name = name;
        this.iconPath = iconPath;
    }
}

class MyComment implements vscode.Comment {
    body: vscode.MarkdownString;
    mode: vscode.CommentMode;
    author: vscode.CommentAuthorInformation;
    reactions?: vscode.CommentReaction[];

    constructor(body: string, mode: vscode.CommentMode, author: vscode.CommentAuthorInformation) {
        this.body = new vscode.MarkdownString();
        this.body.appendMarkdown(body);
        this.body.isTrusted = true;
        this.body.supportHtml = true;
        this.mode = mode;
        this.author = author;
        this.reactions = undefined;
        // this.reactions = [
        //     new MyCommentReaction("Like", vscode.Uri.parse("https://github.githubassets.com/images/icons/emoji/unicode/1f44d.png"), 15, false),
        //     // new vscode.CommentReaction('👎', 'Dislike'),
        // ];
    }
}

// class MyCommentReaction implements vscode.CommentReaction {
//     label: string;
//     iconPath: string | vscode.Uri;
//     count: number;
//     authorHasReacted: boolean;
//     constructor(label: string, iconPath: vscode.Uri, count: number = 0, authorHasReacted: boolean = false) {
//         this.label = label;
//         this.iconPath = iconPath;
//         this.count = count;
//         this.authorHasReacted = authorHasReacted;
//     }
// }

export function refact_console_close()
{
    if (global.comment_disposables) {
        for (let d of global.comment_disposables) {
            d.dispose();
        }
    }
    global.comment_disposables = [];
}

export async function open_refact_console_between_lines(editor: vscode.TextEditor)
{
    refact_console_close();
    let [official_selection, working_on_attach_code, working_on_attach_filename, code_snippet] = chatTab.attach_code_from_editor(editor);
    let cc = vscode.comments.createCommentController("refactai-test", "RefactAI Test Comments");
    cc.commentingRangeProvider = {
        provideCommentingRanges: (document: vscode.TextDocument) => {
            return [official_selection];
        },
    };
    cc.reactionHandler = (comment: vscode.Comment, reaction: vscode.CommentReaction): Thenable<void> => {
        console.log("reactionHandler", comment, reaction);
        return Promise.resolve();
    };
    let my_comments: vscode.Comment[] = [];
    let thread: vscode.CommentThread = cc.createCommentThread(
        editor.document.uri,
        new vscode.Range(official_selection.start.line, 0, official_selection.end.line, 0),
        my_comments,
    );
    thread.canReply = true;
    thread.label = "Refact Console (F1)";
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    global.comment_disposables.push(thread);
    global.comment_disposables.push(cc);

    let messages: [string, string][] = [];
    let single_file_json = JSON.stringify([{
        "file_name": working_on_attach_filename,
        "file_content": working_on_attach_code,
    }]);
    messages.push(["context_file", single_file_json]);

    let hint_debounce: NodeJS.Timeout|undefined;
    vscode.workspace.onDidChangeTextDocument(async e => {
        if (e.document.uri.scheme !== "comment") {
            return;
        }
        if (my_comments.length === 0) {
            return;
        }
        let text = e.document.getText();
        console.log("onDidChangeTextDocument", text);
        // let y = e.document.fileName;  // "/commentinput-8d64259c-9607-4048-a9dc-a73f621e750d-1.md"
        let [hint, author] = rconsoleHints.get_hints(messages, text, official_selection);
        my_comments[0] = new MyComment(hint, vscode.CommentMode.Preview, new MyCommentAuthorInformation(author));
        await vscode.commands.executeCommand('setContext', 'refactcx.runEsc', true);
        if (hint_debounce) {
            clearTimeout(hint_debounce);
        }
        hint_debounce = setTimeout(async () => {
            // this is a heavy operation, changes the layout and lags the UI
            thread.comments = my_comments;
        }, 200);
        if (text.includes("\n")) {
            let first_line = text.split("\n")[0];
            if (first_line.startsWith("/")) {
                for (let cmd in rconsoleHints.commands_available) {
                    if (first_line.startsWith("/" + cmd)) {
                        activate_cmd(cmd);
                        return;
                    }
                }
            } else {
                let question = "```\n" + code_snippet + "\n```\n\n" + text;
                activate_chat(messages, question, editor);
            }
        }
    });
    vscode.workspace.onDidCloseTextDocument(e => {
        if (e.uri.scheme !== "comment") {
            return;
        }
        refact_console_close();
    });
    await vscode.commands.executeCommand('setContext', 'refactcx.runEsc', true);
    await new Promise(resolve => setTimeout(resolve, 100));
    function initial_message()
    {
        let [hint, author] = rconsoleHints.get_hints(messages, "", official_selection);
        my_comments.push(new MyComment(hint, vscode.CommentMode.Preview, new MyCommentAuthorInformation(author)));
        thread.comments = my_comments;
    }
    initial_message();
}

function activate_cmd(cmd: string)
{
    console.log(`activate_cmd refactaicmd.cmd_${cmd}`);
    vscode.commands.executeCommand("refactaicmd.cmd_" + cmd);
}

async function activate_chat(messages: [string, string][], question: string, editor: vscode.TextEditor)
{
    console.log(`activate_chat question.length=${question.length}`);
    // question: string,
    // editor: vscode.TextEditor | undefined,
    // attach_default: boolean,   // checkbox set on start, means attach the current file
    // model: string,
    // messages: [string, string][],
    // chat_id: string,
    // messages = [
    refact_console_close();
    await vscode.commands.executeCommand("refactai-toolbox.focus");
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (global.side_panel && global.side_panel._view) {
            break;
        }
    }
    let chat: chatTab.ChatTab|undefined = await sidebar.open_chat_tab(
        question,
        editor,
        false,
        "",
        messages,
        "");
    if (!chat) {
        return;
    }
    await chat.post_question_and_communicate_answer(
        question,
        "",
        "",
        false,
        messages,
        );
}
