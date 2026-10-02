# uec-webclass-mcp

電通大のWebClassにアクセスするためのMCP。

## セットアップ

`.env.example`をコピーして`.env`を作成し、必要な環境変数を設定してください。

- `UEC_ID`：電通大のID（アルファベットを含む、`x2500000`）
- `UEC_PASSWORD`：電通大アカウントのパスワード
- `UEC_TOTP_URL`：TOTPのQRコードのURL（例：`otpauth://totp/axiole:xxxx?secret=xxxx&issuer=axiole`)

## Docker

`main`へのpushで`latest`、`v*`タグへのpushで同名のタグをGHCRに公開します。PRではビルドのみを実行します。

```sh
docker run --rm --init --env-file .env -p 127.0.0.1:3000:3000 ghcr.io/sevenc-nanashi/uec-webclass-mcp:latest
```

MCPエンドポイントは`http://localhost:3000/mcp`です。

ローカルでビルドする場合は`docker build -t uec-webclass-mcp .`を実行してください。
