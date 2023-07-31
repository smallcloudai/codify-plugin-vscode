/* eslint-disable @typescript-eslint/naming-convention */
(function () {
    const vscode = acquireVsCodeApi();
    const chat_input = document.querySelector('#chat-input');
    const chat_send_button = document.querySelector('#chat-send');
    const chat_content = document.querySelector('.refactcss-chat__content');
    const stop_button = document.querySelector('#chat-stop');
    let chat_controls_moved = false;

    function input_care()
    {
        chat_input.style.height = 'auto';
        chat_input.style.height = chat_input.scrollHeight + 'px';
        const message = chat_input.value;
        let bad = message.trim() === '' || message.length >= 4000;
        chat_send_button.disabled = bad;
        chat_send_button.style.opacity = bad ? 0.5 : 1;
    }

    chat_input.addEventListener('input', function () {
        input_care();
    });

    chat_send_button.addEventListener('click', () => {
        const message = chat_input.value;
        let chat_model_combo = document.getElementById("chat-model");
        console.log(chat_model_combo.options[chat_model_combo.selectedIndex].value);
        [chat_model, chat_model_function] = JSON.parse(chat_model_combo.options[chat_model_combo.selectedIndex].value);
        let chat_attach_file = document.getElementById("chat-attach");
        chat_input.value = '';
        vscode.postMessage({
            type: "question-posted-within-tab",
            chat_question: message,
            chat_model: chat_model,
            chat_model_function: chat_model_function,
            chat_attach_file: chat_attach_file.checked
        });
        if(!chat_controls_moved) {
            const chat_controls = document.querySelector('.refactcss-chat__controls');
            const chat_content = document.querySelector('.refactcss-chat__content');
            chat_content.appendChild(chat_controls);
            chat_controls_moved = true;
            const chat_label = document.getElementById("chat-attach-label");
            const chat_input = document.getElementById("chat-attach");
            if(chat_input.checked) {
                chat_label.innerText = chat_label.innerText.replace("Attach", "Attached");
            }
            document.querySelector('.refactcss-chat__panel').style.maxHeight = '180px';
        }
    });

    stop_button.addEventListener('click', () => {
        vscode.postMessage({ type: "stop-clicked" });
        visibility_control(true);
    });

    chat_input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.shiftKey === false) {
            event.preventDefault();
            chat_send_button.click();
            return true;
        }
        auto_scroll();
    });

    let last_answer_div = null;  // unfinished answers go the same div
    let answer_counter = 0;

    function chat_render(data)
    {
        // question_html: html,
        // question_raw: question
        // answer_html: html,
        // answer_raw: answer
        if (Object.keys(data).length === 0) { return; };
        const message_pair_div = document.createElement('div');
        message_pair_div.classList.add('refactcss-chat__item');
        message_pair_div.dataset.answer_counter = answer_counter;

        if (data.question_html) {
            answer_counter += 1;
            const question_div = document.createElement('div');
            question_div.classList.add('refactcss-chat__question');
            question_div.innerHTML = data.question_html;
            question_div.dataset.raw = data.question_raw;
            question_div.dataset.messages_backup = JSON.stringify(data.messages_backup);
            question_div.dataset.question_backup = data.question_raw;
            message_pair_div.appendChild(question_div);
            last_answer_div = null;
            const retry_button = document.createElement('button');
            retry_button.innerText = 'Retry';
            retry_button.classList.add('refactcss-chat__copybutton');
            question_div.appendChild(retry_button);
            retry_button.addEventListener('click', () => {
                vscode.postMessage({
                    type: "reset-messages",
                    messages_backup: JSON.parse(question_div.dataset.messages_backup)
                });
                chat_input.value = question_div.dataset.question_backup;
                answer_counter = parseInt(message_pair_div.dataset.answer_counter);
                const chats = document.querySelectorAll('.refactcss-chat__item');
                for (let i = chats.length - 1; i >= 0; i--) {
                    const chat = chats[i];
                    if (parseInt(chat.dataset.answer_counter) >= answer_counter) {
                        chat.remove();
                    }
                }
                visibility_control(true);
                chat_input.focus();
            });
        }

        if (!last_answer_div && data.answer_html) {
            const answer_div = document.createElement('div');
            answer_div.classList.add('refactcss-chat__answer');
            message_pair_div.appendChild(answer_div);
            last_answer_div = answer_div;
        }

        if (last_answer_div && data.answer_html) {
            last_answer_div.innerHTML = data.answer_html;
            last_answer_div.dataset.raw = data.answer_raw;
            last_answer_div.dataset.have_editor = data.have_editor;
        }
        if(message_pair_div.children.length > 0) {
            chat_content.appendChild(message_pair_div);
        }
    }

    function renderMessageOverview(data) {
        if (!data) {
          return; // If no overview is provided, exit the function
        }
      
        const overviewDiv = document.createElement('div');
        overviewDiv.classList.add('message-overview');
        overviewDiv.innerText = 'Overview: ' + data;
      
        // Append the overview div to the container element
        const container = document.getElementById('message-container');
        container.appendChild(overviewDiv);
      }

      function renderMessageSources(data) {
        if (!sources || sources.length === 0) {
          return; // If no sources are provided or the sources array is empty, exit the function
        }
      
        const sourcesDiv = document.createElement('div');
        sourcesDiv.classList.add('message-sources');
        sourcesDiv.innerText = 'Sources: ' + data.join(', ');
      
        // Append the sources div to the container element
        const container = document.getElementById('message-container');
        container.appendChild(sourcesDiv);
      }
      
      

    function backquote_backquote_backquote_remove_syntax_highlighting(code) {
        // this removes ```python or ```json or similar, assuming ``` itself is already not there
        while (1) {
            if (code.startsWith('\n')) {
                return code.substring(1);
            }
            let first_char = code[0];
            if (first_char >= 'a' && first_char <= 'z' || first_char >= '0' && first_char <= '9') {
                code = code.substring(1);
                continue;
            }
        }
    }

    function chat_add_code_buttons() {
        const chats = document.querySelectorAll('.refactcss-chat__item');
        if (chats.length === 0) { return; }
        const last = chats[chats.length - 1];
        const answer_div = last.querySelector('.refactcss-chat__answer');
        if (!answer_div) { return; }
        const snippets = answer_div.querySelectorAll('pre code');
        const raw = answer_div.dataset.raw;
        const raw_snippets = raw.split('```');
        for (let i = 0; i<snippets.length; i++) {
            let pre = snippets[i];
            // const code = pre.innerHTML;
            if (raw_snippets.length <= 2*i + 1) {
                continue;
            }
            const code = backquote_backquote_backquote_remove_syntax_highlighting(raw_snippets[2*i + 1]);
            const copy_button = document.createElement('button');
            const new_button = document.createElement('button');
            copy_button.innerText = 'Copy';
            copy_button.classList.add('refactcss-chat__copybutton');
            new_button.innerText = 'New File';
            new_button.classList.add('refactcss-chat__newbutton');
            copy_button.addEventListener('click', () => {
                copy_to_clipboard(code);
            });
            new_button.addEventListener('click', () => {
                vscode.postMessage({ type: "open-new-file", value: code });
            });
            // console.log("HAVE EDITOR", answer_div.dataset.have_editor, typeof answer_div.dataset.have_editor);
            // it's a string for some reason
            if (answer_div.dataset.have_editor === 'true') {
                const diff_button = document.createElement('button');
                diff_button.addEventListener('click', () => {
                    vscode.postMessage({ type: "diff-paste-back", value: code });
                    diff_button.style.display = 'none';
                });
                diff_button.innerText = 'Diff';
                diff_button.classList.add('refactcss-chat__diffbutton');
                pre.appendChild(diff_button);
            }
            pre.appendChild(copy_button);
            pre.appendChild(new_button);
        }
    }

    function copy_to_clipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    let currentHeight = document.querySelector('.refactcss-chat__content');
    function auto_scroll() {
        input_care();
        currentHeight.scrollTop = currentHeight.scrollHeight;
    }

    window.addEventListener("message", (event) => {
		const message = event.data;
        let input_should_be_visible = false;
		switch (message.command) {
        case "chat-set-fireup-options":
            let chat_attach_file = document.getElementById("chat-attach");
            chat_attach_file.checked = message.chat_attach_default;
            let label = document.getElementById("chat-attach-label");
            if (message.chat_attach_file) {
                label.innerText = `Attach ${message.chat_attach_file}`;
            } else {
                label.innerText = `Attach file`;
                label.style.opacity = 0.5;
                label.parentElement.style.opacity = 0.35;
                label.parentElement.style.pointerEvents = 'none';
            }
            let chat_model_combo = document.getElementById("chat-model");
            for (let i = 0; i < message.chat_models.length; i++) {
                let option = document.createElement("option");
                option.value = JSON.stringify(message.chat_models[i]);
                option.text = message.chat_models[i][0];
                if (message.chat_use_model === message.chat_models[i][0] && message.chat_use_model_function === message.chat_models[i][1]) {
                    option.selected = true;
                }
                if (message.chat_use_model==="" && i===0) {
                    option.selected = true;
                }
                chat_model_combo.appendChild(option);
            }
            input_should_be_visible = true;
            break;
        case "chat-end-streaming":
            input_should_be_visible = true;
            chat_add_code_buttons();
            break;
        case "chat-error-streaming":
            input_should_be_visible = true;
            chat_input.value = message.backup_user_phrase;
            break;
        case "chat-post-question":
            chat_render(message);
            break;
        case "chat-post-answer":  // streaming also goes there, with partial answers
            chat_render(message);
            break;
        case "chat-post-answer-header-desc":
            renderMessageOverview(message);
            break;
        case "chat-post-answer-header-sources":
            renderMessageSources(message);
            break;
        
        case "chat-set-question-text":
            input_should_be_visible = true;
            chat_input.value = message.value.question;
            setTimeout(() => {
                input_care();
            }, 100);
            input_care();
            break;
        case "nop":
            break;
        }
        visibility_control(input_should_be_visible);
        if (message.command.includes("streaming")) {
            chat_input.focus();
        }
    });

    function visibility_control(input_should_be_visible) {
        if (input_should_be_visible) {
            stop_button.style.display = 'none';
            chat_input.style.display = 'block';
            chat_send_button.style.display = 'block';
        } else {
            stop_button.style.display = 'flex';
            chat_input.style.display = 'none';
            chat_send_button.style.display = 'none';
        }
        auto_scroll();
    }

    chat_input.focus();
})();
