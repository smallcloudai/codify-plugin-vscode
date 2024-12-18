import * as vscode from 'vscode';
import * as path from 'path';

async function getPythonExec<T = any>(extension:  any): Promise<string | undefined> {
    const execDetails = await extension.exports.settings.getExecutionDetails();
    let result: string | undefined;
    if (execDetails.execCommand && execDetails.execCommand.length > 0) {
        result = execDetails.execCommand[0];
    }
    return result;
}

async function getPythonEnvHome<T = any>(extension:  any): Promise<string[] | undefined> {
    const pythonEnv = await extension.exports.environment.getActiveEnvironmentPath();
    let res: string[] = []
    if (pythonEnv.pathType == "interpreterPath") {
        let python_exe_path = pythonEnv.path;
        let env_home = path.dirname(path.dirname(python_exe_path));
        res.concat([path.join(env_home, "bin"), path.join(env_home, "Bin"), path.join(env_home, "sbin"), path.join(env_home, "Scripts")]);
    } else if (pythonEnv.pathType == "envFolderPath") {
        res.concat([path.join(pythonEnv.path, "bin"), path.join(pythonEnv.path, "Bin"), path.join(pythonEnv.path, "sbin"), path.join(pythonEnv.path, "Scripts")]);
    } else {
        console.log("collectEnvAndUpdateLsp.getPythonEnvHome: undefined python pathType")
    }
    return res;
}

export async function collectEnvAndUpdateLsp() {
    let payload: { [id: string]: any; } = {
        "PATH": [],
    }
    const python_extension = vscode.extensions.getExtension('ms-python.python');

    if (python_extension) {
        if (python_extension.packageJSON?.featureFlags?.usingNewInterpreterStorage) {
            if (!python_extension.isActive) {
                await python_extension.activate();
            }
            const python_exec_path = await getPythonExec(python_extension);
            if (python_exec_path) {
                payload["PYTHON_PATH_EXE"] = python_exec_path
            }
            const python_env_pathes = await getPythonEnvHome(python_extension);
            payload["PATH"].concat(python_env_pathes)
        }
    }
    await global.rust_binary_blob?.update_env(payload);
}

export async function subscribeSettingsChanges() {
    const python_extension = vscode.extensions.getExtension('ms-python.python');
    if (python_extension) {
        if (python_extension.packageJSON?.featureFlags?.usingNewInterpreterStorage) {
            if (!python_extension.isActive) {
                await python_extension.activate();
            }
            if (python_extension.exports.settings.onDidChangeExecutionDetails) {
                python_extension.exports.settings.onDidChangeExecutionDetails(async () => {
                    await collectEnvAndUpdateLsp()
                });
            }
        }
    }
}
