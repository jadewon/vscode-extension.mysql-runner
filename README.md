# mysql-runner README

Mac용 무료 SQL client 들이 하나씩 사라짐에 따라 귀찮아서 대충 개인용도로 만들어 사용하기로 한다.

잘 모르겠으면 공개된 vscode extension 사용 권장.

MySQL Login path 를 사용하므로, 설정이 필요하면 미리 설정한다.

## Generate login path
```bash
mysql_config_editor set --login-path=이름 --host=DB주소 --user=아이디 --port=포트 --password
```

## Setting
ssh로 연결해야 되는 것들은 미리 ssh tunneling 설정을 해둔다.
### ~/.ssh/config
```
Host db
  LocalForward [localport] [db host]:[db port]
  HostName [remote ssh host]
  User ec2-user
  IdentityFile ~/.ssh/
```

vscode에 설정파일에 설정값을 추가 해준다.
### vscode settings.json
```json
{
  "sql-runner.loginPath": "login path name",
  "sql-runner.database": "database name",
  "sql-runner.selectLimit": 100
}
```
