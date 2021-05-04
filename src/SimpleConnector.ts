import { exec, spawn } from 'child_process';

export default class SimpleConnector {
  constructor(private loginPath?: string, private database?: string, private limit = 100) {
    if (!this.loginPath || !this.database) {
      throw new Error('DB information needs to provide');
    }
  }

  async query(sql: string, useExecuteTime = true): Promise<string> {
    if (!this.loginPath || !this.database) {
      throw new Error('DB information needs to provide');
    }
    sql = sql
      .replace(/#.*$/gm, '') // # comment
      .replace(/--.*$/gm, '') // -- comment
      .replace(/\n/g, ' ') // oneline
      .replace(/\s+/g, ' ') // remove useless spaces
      .replace(/"/g, '\"'); // escape "
    useExecuteTime && (sql = `set profiling=1;${sql};show profiles;`);
    const cmd = `mysql --login-path=${this.loginPath} --select-limit=${this.limit} --table ${this.database} -e "${sql}"`;

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
}
