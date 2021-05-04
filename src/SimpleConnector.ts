import { exec, spawn } from 'child_process';

interface ILoginPathEntry {
  name: string;
  user: string;
  password?: string;
  host: string;
  port: string;
}

export default class SimpleConnector {
  constructor(private loginPath?: string, private database?: string, private limit = 100) {
    if (!this.loginPath || !this.database) {
      throw new Error('DB information needs to provide');
    }
  }

  public async query(sql: string, useExecuteTime = true): Promise<string> {
    if (!this.loginPath) {
      throw new Error('DB information needs to provide');
    }
    sql = sql
      .replace(/#.*$/gm, '') // # comment
      .replace(/--.*$/gm, '') // -- comment
      .replace(/\n/g, ' ') // oneline
      .replace(/\s+/g, ' ') // remove useless spaces
      .replace(/"/g, '\"'); // escape "
    useExecuteTime && (sql = `set profiling=1;${sql};show profiles;`);
    const cmd = [
      `mysql`,
      `--login-path=${this.loginPath}`,
      `--select-limit=${this.limit}`,
      `--table`,
      this.database ?? '',
      `-e "${sql}"`
    ].join(' ');

    return new Promise(resolve => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          resolve(error.message.split('\n').slice(1).join('\n'));
        } else if (stderr) {
          resolve(stderr);
        } else {
          // calculate execute time from profiles results
          const pattern = /[+-]+\n\|\s*Query_ID\s*\|\s*Duration\s*\|\s*Query\s*\|\n[+-]+\n(\|\s*\d+\s*\|\s*[\.\d]+\s*\|\s*(?:[\S\s]+?)\s\|\n)+[+-]+/;
          const matches = stdout.match(pattern);
          let executeTime = 0;
          if (matches) {
            executeTime = (matches[0].match(/(\|\s*\d+\s*\|\s*[\.\d]+\s*\|\s*(?:[\S\s]+?)\s\|\n)/g) ?? [])
              .map(v => v.replace(/\|\s*\d+\s*\|\s*([\.\d]+)\s*\|\s*(?:[\S\s]+?)\s\|\n/, '$1'))
              .reduce((p, c) => +c + p, 0);
            stdout = stdout.replace(matches[0], () => executeTime.toFixed(4) + ' seconds');
          }

          resolve(stdout);
        }
      });
    });
  }

  public getLoginPathName(): string {
    return this.loginPath ?? '';
  }

  public async getLoginPathList(): Promise<ILoginPathEntry[]> {
    return new Promise<string>((resolve, reject) => {
      exec('mysql_config_editor print --all', (error, stdout, stderr) => error ? reject(error) : resolve(stdout ?? stderr));
    }).then(output => {
      const entries = output.match(/\[(.*?)\]\n((user|host|port|password)\s*=\s*.+\n)+/g) ?? [];
      return entries.map(entry => {
        const lines = entry.match(/^(?:\[(?<name>.*?)\]|(user|host|port|password)\s*=\s*(.+))$/mg) ?? [];
        return lines.reduce((prev, line) => {
          const match = line.match(/^(?:\[(?<name>.*?)\]|(?<key>user|host|port|password)\s*=\s*(?<value>.+))$/m);
          if (match) {
            const result = { ...match.groups };
            return result.name ? Object.assign(prev, { name: result.name }) :  Object.assign(prev, { [result.key]: result.value }) as ILoginPathEntry;
          }
          return prev;
        }, {} as ILoginPathEntry);
      });
    });
  }

  public setLoginPath(loginPath: string): SimpleConnector {
    this.loginPath = loginPath;
    return this;
  }

  public setDatabase(database?: string): SimpleConnector {
    this.database = database;
    return this;
  }

  public changeConnection(loginPath: string, database?: string): SimpleConnector {
    this.setLoginPath(loginPath);
    this.setDatabase(database);
    return this;
  }

  public async fetchDatabases(): Promise<string[]> {
    return this.query('show databases;', false).then<string[]>((value: string) => {
      const list: string[] | null = String(value).match(/([\w\d_]+)/g);
      return (list && list.length > 1) ? list.slice(1) : ([] as string[]);
    });
  }
}
