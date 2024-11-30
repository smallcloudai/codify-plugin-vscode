/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as fetchAPI from "./fetchAPI";
import * as userLogin from "./userLogin";
import * as Diff from "diff";  // Documentation: https://github.com/kpdecker/jsdiff/
import * as storeVersions from './storeVersions';
import * as estate from './estate';
import * as codeLens from "./codeLens";
import * as crlf from "./crlf";

let global_nav_counter: number = 0;


export async function on_cursor_moved(editor: vscode.TextEditor, pos: vscode.Position, is_mouse: boolean)
{
    let state = estate.state_of_editor(editor, "on_cursor_moved");
    if (!state) {
        return;
    }
    global_nav_counter += 1;
    for (let i = 0; i < state.sensitive_ranges.length; i++) {
        const element = state.sensitive_ranges[i];
        if (element.range.contains(pos)) {
            let my_counter = global_nav_counter;
            setTimeout(() => {
                if (!state) {
                    return;
                }
                if (global_nav_counter === my_counter) {
                    // query_diff(editor, element.range, "diff-atcursor", "", false);
                }
            }, is_mouse ? 0 : 300);
        }
    }
    let selection = editor.selection;
    let is_empty = selection.anchor.line === selection.active.line && selection.anchor.character === selection.active.character;
    if (!is_empty && !state.diff_changing_doc) {
        state.diff_lens_pos = Number.MAX_SAFE_INTEGER;
        state.completion_lens_pos = Number.MAX_SAFE_INTEGER;
        codeLens.quick_refresh();
        estate.switch_mode(state, estate.Mode.Normal);  // dislike_and_rollback(editor) inside
    }
}


// export async function query_diff(
//     editor: vscode.TextEditor,
//     sensitive_area: vscode.Range,
//     model_function: string,
//     model_force: string,
//     third_party: boolean,
// ) {
//     // NOT called from estate switch mode
//     let state = estate.state_of_editor(editor, "query_diff");
//     if (!state) {
//         return;
//     }
//     state.showing_diff_for_function = undefined;
//     state.showing_diff_for_model = undefined;
//     state.showing_diff_thirdparty = third_party;
//     state.showing_diff_modif_doc = undefined;

//     let doc = editor.document;
//     let access_level = await privacy.get_file_access(doc.fileName);
//     if (third_party && access_level < 2) {
//         return;
//     }
//     if (!third_party && access_level < 1) {
//         return;
//     }

//     let cancellationTokenSource = new vscode.CancellationTokenSource();
//     let cancelToken = cancellationTokenSource.token;
//     let request = new fetchAPI.PendingRequest(undefined, cancelToken);

//     await fetchAPI.cancel_all_requests_and_wait_until_finished();
//     if (state.get_mode() !== estate.Mode.Normal) {
//         await estate.back_to_normal(state);
//     }
//     request.cancellationTokenSource = cancellationTokenSource;
//     let login = await userLogin.inference_login();
//     if (!login) { return; }
//     await fetchAPI.wait_until_all_requests_finished();
//     if (cancelToken.isCancellationRequested) {
//         return;
//     }
//     let file_name = storeVersions.filename_from_document(doc);
//     await estate.switch_mode(state, estate.Mode.DiffWait);
//     state.diff_lens_pos = sensitive_area.start.line;
//     state.showing_diff_for_range = sensitive_area;
//     state.diff_load_animation_head = 0;
//     state.diff_load_animation_mid = "";
//     animation_start(editor, state);
//     codeLens.quick_refresh();

//     async function _streaming_callback(json: any)
//     {
//         if (!state) {
//             return;
//         }
//         if (json === undefined) {
//             if (state.get_mode() === estate.Mode.DiffWait) {
//                 await estate.switch_mode(state, estate.Mode.Normal);
//             }
//             return;
//         }
//         if (state.get_mode() !== estate.Mode.DiffWait) {
//             return;
//         }
//         if (cancelToken.isCancellationRequested) {
//             console.log("diff request is cancelled, new data is coming");
//             if (state.get_mode() === estate.Mode.DiffWait) {
//                 state.diff_lens_pos = Number.MAX_SAFE_INTEGER;
//                 codeLens.quick_refresh();
//                 await estate.switch_mode(state, estate.Mode.Normal);
//             }
//             return;
//         } else {
//             if (json && json["choices"]) {
//                 // let modif_doc = json["choices"][0]["files"][file_name];
//                 // let files = files_from_head_mid_tail(sources, json["choices"][0]["files_head_mid_tail"]);
//                 let files: { [key: string]: string } = {};
//                 let choice0 = json["choices"][0];
//                 if ("files_head_mid_tail" in choice0) {
//                     let files_head_mid_tail = json["choices"][0]["files_head_mid_tail"];
//                     for (let key in files_head_mid_tail) {
//                         let hmt = files_head_mid_tail[key];
//                         let original_doc = sources[key];
//                         files[key] = original_doc.substring(0, hmt["head"]) + hmt["mid"] + original_doc.substring(original_doc.length-hmt["tail"]);
//                         if (key === file_name) {
//                             state.diff_load_animation_head = hmt["head"];
//                             state.diff_load_animation_mid = hmt["mid"];
//                         }
//                     }
//                 } else {
//                     files = choice0["files"];
//                 }
//                 let modif_doc = files[file_name];
//                 // if (feedback) {
//                 //     feedback.results = files;
//                 //     feedback.ts_presented = Date.now();
//                 // }
//                 state.showing_diff_for_function = model_function;
//                 state.showing_diff_for_model = model_force;
//                 state.showing_diff_thirdparty = third_party;
//                 state.showing_diff_modif_doc = modif_doc;
//                 await estate.switch_mode(state, estate.Mode.DiffWait);
//             }
//             if (json && json["metering_balance"]) {
//                 global.user_metering_balance = json["metering_balance"];
//                 if (global.side_panel) {
//                     global.side_panel.update_webview();
//                 }
//             }
//         }
//     }

//     async function _streaming_end_callback(any_error: boolean)
//     {
//         if (!state) {
//             return;
//         }
//         console.log("streaming end callback");
//         if (state.get_mode() === estate.Mode.DiffWait) {
//             await estate.switch_mode(state, estate.Mode.Normal);
//             await estate.switch_mode(state, estate.Mode.Diff);
//         }
//     }

//     let whole_doc = doc.getText();
//     let cursor0 = doc.offsetAt(sensitive_area.start);
//     let cursor1 = doc.offsetAt(sensitive_area.end);
//     let cursors: number[];
//     [whole_doc, cursors] = crlf.cleanup_cr_lf(whole_doc, [cursor0, cursor1]);
//     cursor0 = cursors[0];
//     cursor1 = cursors[1];
//     let sources: { [key: string]: string } = {};
//     let no_newline = whole_doc[whole_doc.length-1] !== "\n";
//     if (no_newline) {
//         whole_doc += "\n";
//     }
//     sources[file_name] = whole_doc;
//     let max_tokens = 550;
//     let stop_tokens: string[] = [];
//     let max_edits = model_function==="diff-atcursor" ? 1 : 10; // the other is "diff-selection"
//     let stream = true;

//     request.set_streaming_callback(_streaming_callback, _streaming_end_callback);
//     // let feedback = state.data_feedback_candidate;
//     // if (feedback) {
//     //     feedback.sources = sources;
//     //     feedback.intent = estate.global_intent;
//     //     feedback.function = model_function;
//     //     feedback.cursor_file = file_name;
//     //     feedback.cursor_pos0 = cursor0;
//     //     feedback.cursor_pos1 = cursor1;
//     //     feedback.ts_req = Date.now();
//     // }

//     request.supply_stream(...fetchAPI.fetch_api_promise(
//         cancelToken,
//         "query_diff" + ":" + model_function,  // scope
//         sources,
//         estate.global_intent,
//         model_function,
//         file_name,
//         cursor0,
//         cursor1,
//         max_tokens,
//         max_edits,
//         stop_tokens,
//         stream,
//         model_force,
//         third_party,
//     ));
// }


export async function animation_start(editor: vscode.TextEditor, state: estate.StateOfEditor)
{
    // highlight.hl_clear(editor);
    let grey_deco: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({opacity: "0.5"});
    let gray_ranges: vscode.Range[] = [];
    let animation_decos: vscode.TextEditorDecorationType[] = [];
    let animation_ranges: vscode.Range[][] = [];
    for (let c=0; c<20; c++) {
        let phase = c / 10;
        let red =   Math.max(100, Math.floor(255 * Math.sin(phase * Math.PI + Math.PI)));
        let blue =  Math.max(100, Math.floor(255 * Math.sin(phase * Math.PI + Math.PI / 2)));
        let green = Math.max(100, Math.floor(255 * Math.sin(phase * Math.PI + 3 * Math.PI / 2)));
        let red_str = red.toString();
        let green_str = green.toString();
        let blue_str = blue.toString();
        animation_decos.push(vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(' + red_str + ', ' + green_str + ', ' + blue_str + ', 0.3)',
            // isWholeLine: true,
        }));
        animation_ranges.push([]);
    }
    let t = 0;
    let rainbow_area = state.showing_diff_for_range;
    if (!rainbow_area) {
        return;
    }
    while (state.get_mode() === estate.Mode.DiffWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        let have_data_line0 = state.editor.document.positionAt(state.diff_load_animation_head).line;
        let number_of_slash_n_in_mid = (state.diff_load_animation_mid.match(/\n/g) || []).length;
        let have_data_line1 = have_data_line0 + number_of_slash_n_in_mid;
        for (let a=0; a<animation_decos.length; a++) {
            animation_ranges[a].length = 0;
        }
        gray_ranges.length = 0;
        for (let line_n=rainbow_area.start.line; line_n<=rainbow_area.end.line; line_n++) {
            if (line_n > have_data_line0 && line_n < have_data_line1) {
                let range = new vscode.Range(line_n, 0, line_n, 1000);
                gray_ranges.push(range);
                continue;
            }
            let line = editor.document.lineAt(line_n);
            for (let c=0; c<line.text.length; c+=2) {
                let a = (line_n + c + t) % animation_decos.length;
                let range = new vscode.Range(
                    new vscode.Position(line_n, c),
                    new vscode.Position(line_n, c+2),
                );
                animation_ranges[a].push(range);
            }
        }
        for (let a=0; a<animation_decos.length; a++) {
            editor.setDecorations(animation_decos[a], animation_ranges[a]);
        }
        editor.setDecorations(grey_deco, gray_ranges);
        t += 1;
    }
    for (let a=0; a<animation_decos.length; a++) {
        animation_decos[a].dispose();
    }
    grey_deco.dispose();
}

export async function present_diff_to_user(editor: vscode.TextEditor, modif_doc: string, move_cursor: boolean)
{
    let state = estate.state_of_editor(editor, "present_diff_to_user");
    if (!state) {
        return;
    }
    _remove_decoration(editor);
    // highlight.hl_clear(editor);
    let document = editor.document;
    let whole_doc = document.getText();
    let no_newline = whole_doc[whole_doc.length-1] !== "\n";
    if (no_newline) {   // server side always adds the missing newline, client side diff gets confused
        whole_doc += "\n";
    }
    let cursors: number[];
    [whole_doc, cursors] = crlf.cleanup_cr_lf(whole_doc, []);
    if (whole_doc === modif_doc) {
        console.log(["apply diff -- no change"]);
        // no change, but go on because we want UI to be the same
    }


    const diff = Diff.diffLines(whole_doc, modif_doc, {
        // ignoreNewlineAtEof: true,
        ignoreWhitespace: true, // can remove trailing new lines
        // newlineIsToken: true,
    });

    let green_bg_ranges: vscode.Range[] = [];
    let red_bg_ranges: vscode.Range[] = [];
    let very_green_bg_ranges: vscode.Range[] = [];
    let very_red_bg_ranges: vscode.Range[] = [];
    state.diffDeletedLines = [];
    state.diffAddedLines = [];
    state.diff_changing_doc = true;
    await editor.edit((e: vscode.TextEditorEdit) => {
        if (no_newline) {
            e.insert(new vscode.Position(document.lineCount, 0), "\n");
        }
        let line_n = 0;
        let line_n_insert = 0;
        let chunk_remember_removed = '';
        let chunk_remember_removed_line = -1;
        let chunk_remember_added = '';
        let chunk_remember_added_line = -1;

        diff.forEach((part) => {
            if (!state) {
                return;
            }
            let span = part.value;
            let span_lines = span.split('\n');
            let span_lines_count = span_lines.length - 1;
            if (part.removed) {
                // console.log(["removed span_lines_count", span_lines_count, span]);
                red_bg_ranges.push(new vscode.Range(
                    new vscode.Position(line_n, 0),
                    new vscode.Position(line_n + span_lines_count - 1, 0),
                ));
                for (let i=0; i<span_lines_count; i++) {
                    state.diffDeletedLines.push(line_n + i);
                }
                chunk_remember_removed = span;
                chunk_remember_removed_line = line_n;
                line_n += span_lines_count;
                line_n_insert += span_lines_count;
            } else if (part.added) {
                // console.log(["added span_lines_count", span_lines_count, span]);
                e.insert(
                    new vscode.Position(line_n_insert, 0),
                    span
                    );
                green_bg_ranges.push(new vscode.Range(
                    new vscode.Position(line_n, 0),
                    new vscode.Position(line_n + span_lines_count - 1, 0),
                ));
                for (let i=0; i<span_lines_count; i++) {
                    state.diffAddedLines.push(line_n + i);
                }
                chunk_remember_added = span;
                chunk_remember_added_line = line_n;
                line_n += span_lines_count;
                if (chunk_remember_removed) {
                    const diff_char = Diff.diffChars(chunk_remember_removed, chunk_remember_added);
                    let char_del_line = chunk_remember_removed_line;
                    let char_ins_line = chunk_remember_added_line;
                    let char_del_pos = 0;
                    let char_ins_pos = 0;

                    diff_char.forEach((part_char) => {
                        let txt = part_char.value;
                        if (part_char.removed) {
                            very_red_bg_ranges.push(new vscode.Range(
                                new vscode.Position(char_del_line, char_del_pos),
                                new vscode.Position(char_del_line, char_del_pos + txt.length),
                            ));
                        } else if (part_char.added) {
                            very_green_bg_ranges.push(new vscode.Range(
                                new vscode.Position(char_ins_line, char_ins_pos),
                                new vscode.Position(char_ins_line, char_ins_pos + txt.length),
                            ));
                        }
                        
                        if (part_char.removed || (part_char.added === undefined)) {
                            for (let c=0; c<txt.length; c++) {
                                if (txt[c] === '\n') {
                                    char_del_line++;
                                    char_del_pos = 0;
                                } else {
                                    char_del_pos++;
                                }
                            }
                        } else if (part_char.added || (part_char.removed === undefined)) {
                            for (let c=0; c<txt.length; c++) {
                                if (txt[c] === '\n') {
                                    char_ins_line++;
                                    char_ins_pos = 0;
                                } else {
                                    char_ins_pos++;
                                }
                            }
                        } else if(!part_char.added && !part_char.removed) {
                            for (let c=0; c<txt.length; c++) {
                                if (txt[c] === '\n') {
                                    char_del_line++;
                                    char_ins_line++;
                                    char_del_pos = 0;
                                } else {
                                    char_del_pos++;
                                    char_ins_pos++;
                                }
                            }
                        }
                    });
                }
            } else {
                // console.log(["unchanged", span.length]);
                line_n += span_lines_count;
                line_n_insert += span_lines_count;
                chunk_remember_removed = "";
            }
        });
    }, { undoStopBefore: false, undoStopAfter: false }).then(() => {
        let state = estate.state_of_editor(editor, "apply_diff");
        if (!state) {
            return;
        }
        state.diff_changing_doc = false;
        let norm_fg = new vscode.ThemeColor('editor.foreground');
        // let ghost_text_color = new vscode.ThemeColor('editorGhostText.foreground');
        // let inserted_line_bg = new vscode.ThemeColor('diffEditor.insertedLineBackground');
        // let green_type = vscode.window.createTextEditorDecorationType({
        //     color: ghost_text_color,
        //     isWholeLine: true,
        // });
        let extension_path = vscode.extensions.getExtension('smallcloud.codify')!.extensionPath;
        let green_type = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            color: norm_fg,
            isWholeLine: true,
            gutterIconPath: extension_path + '/images/add_line.svg',
            gutterIconSize: '40%',
        });
        let very_green_type = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 255, 0, 0.30)',
            color: norm_fg,
        });
        // let red_path = vscode.Uri.file('././images/add_plus_icon.svg');
        let red_type = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            isWholeLine: true,
            gutterIconPath: extension_path + '/images/remove_line.svg',
            gutterIconSize: '40%',
        });
        let very_red_type = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.30)',
        });
        editor.setDecorations(green_type, green_bg_ranges);
        editor.setDecorations(red_type, red_bg_ranges);
        editor.setDecorations(very_green_type, very_green_bg_ranges);
        editor.setDecorations(very_red_type, very_red_bg_ranges);
        let scroll_to: number[] = [];
        if (state.diffAddedLines.length > 0) {
            scroll_to.push(state.diffAddedLines[0]);
            scroll_to.push(state.diffAddedLines[state.diffAddedLines.length - 1]);
        }
        if (state.diffDeletedLines.length > 0) {
            scroll_to.push(state.diffDeletedLines[0]);
            scroll_to.push(state.diffDeletedLines[state.diffDeletedLines.length - 1]);
        }
        if (scroll_to.length > 0) {
            let reveal_range = new vscode.Range(
                new vscode.Position(Math.min(...scroll_to), 0),
                new vscode.Position(Math.max(...scroll_to), 0),
            );
            editor.revealRange(reveal_range);
            if (move_cursor) {
                editor.selection = new vscode.Selection(reveal_range.start, reveal_range.start);
            }
        }
        state.diffDecos.push(green_type);
        state.diffDecos.push(red_type);
        state.diffDecos.push(very_green_type);
        state.diffDecos.push(very_red_type);
    });
    state.diff_lens_pos = Math.min(state.diff_lens_pos, ...state.diffAddedLines, ...state.diffDeletedLines);
    console.log(["code_lens_pos", state.diff_lens_pos]);
    codeLens.quick_refresh();
}


function _remove_decoration(editor: vscode.TextEditor)
{
    let state = estate.state_of_editor(editor, "remove_decoration");
    if (!state) {
        return;
    }
    for (let deco of state.diffDecos) {
        deco.dispose();
    }
    state.diffDecos.length = 0;
    state.diffAddedLines.length = 0;
    state.diffDeletedLines.length = 0;
}


export async function dislike_and_rollback(editor: vscode.TextEditor)
{
    let state = estate.state_of_editor(editor, "dislike_and_rollback");
    if (!state) {
        return;
    }
    state.diff_changing_doc = true;
    state.diff_lens_pos = Number.MAX_SAFE_INTEGER;
    state.completion_lens_pos = Number.MAX_SAFE_INTEGER;
    codeLens.quick_refresh();
    await editor.edit((e) => {
        if (!state) {
            return;
        }
        for (let i=0; i<state.diffAddedLines.length; i++) {
            e.delete(new vscode.Range(
                new vscode.Position(state.diffAddedLines[i], 0),
                new vscode.Position(state.diffAddedLines[i] + 1, 0),
            ));
        }
    }, { undoStopBefore: false, undoStopAfter: false }).then(async () => {
        if (!state) {
            return;
        }
        state.diff_changing_doc = false;
        _remove_decoration(editor);
        // let feedback = state.data_feedback_candidate;
        // if (feedback && feedback.cursor_file) {
        //     feedback.positive = false;
        //     await dataCollection.data_collection_save_record(feedback);
        // }
        // dataCollection.data_feedback_candidate_reset(state);
    });
}


export async function like_and_accept(editor: vscode.TextEditor)
{
    let state = estate.state_of_editor(editor, "like_and_accept");
    if (!state) {
        return;
    }
    state.diff_changing_doc = true;
    state.diff_lens_pos = Number.MAX_SAFE_INTEGER;
    state.completion_lens_pos = Number.MAX_SAFE_INTEGER;
    codeLens.quick_refresh();
    let thenable = editor.edit((e) => {
        if (!state) {
            return;
        }
        for (let i=0; i<state.diffDeletedLines.length; i++) {
            e.delete(new vscode.Range(
                new vscode.Position(state.diffDeletedLines[i], 0),
                new vscode.Position(state.diffDeletedLines[i] + 1, 0),
            ));
        }
    }, { undoStopBefore: false, undoStopAfter: true });
    thenable.then(async () => {
        if (!state) {
            return;
        }
        state.diff_changing_doc = false;
        _remove_decoration(editor);
        vscode.commands.executeCommand('setContext', 'refactcx.runTab', false);
        console.log(["TAB OFF DIFF"]);
        vscode.commands.executeCommand('setContext', 'refactcx.runEsc', false);
        console.log(["ESC OFF DIFF"]);
        if (state.highlight_json_backup) {
            state.highlight_json_backup = undefined;
            await estate.back_to_normal(state);
            // highlight.query_highlight(editor, "", state.highlight_function, state.highlight_model, state.highlight_thirdparty);
        } else {
            state.highlight_json_backup = undefined;
            await estate.back_to_normal(state);
        }
        codeLens.quick_refresh();
        // let feedback = state.data_feedback_candidate;
        // if (feedback && feedback.cursor_file) {
        //     feedback.positive = true;
        //     await dataCollection.data_collection_save_record(feedback);
        // }
        // dataCollection.data_feedback_candidate_reset(state);
    });
    await thenable;
}


// export async function query_the_same_thing_again(editor: vscode.TextEditor)
// {
//     let state = estate.state_of_editor(editor, "query_the_same_thing_again");
//     if (!state) {
//         return;
//     }
//     if (state.showing_diff_for_range !== undefined && state.showing_diff_for_function !== undefined && state.showing_diff_for_model !== undefined) {
//         _remove_decoration(editor);
//         query_diff(editor, state.showing_diff_for_range, state.showing_diff_for_function, state.showing_diff_for_model, state.showing_diff_thirdparty);
//     }
// }


export function hands_off_dont_remove_anything(editor: vscode.TextEditor)
{
    // Don't delete anything, user has already started same edit, leave it alone
    let state = estate.state_of_editor(editor, "hands_off");
    if (!state) {
        return;
    }
    state.diff_lens_pos = Number.MAX_SAFE_INTEGER;
    state.completion_lens_pos = Number.MAX_SAFE_INTEGER;
    codeLens.quick_refresh();
    _remove_decoration(editor);
}
