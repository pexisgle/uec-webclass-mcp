# uec-webclass-mcp

電通大のWebClassにアクセスするためのMCP。

## セットアップ

`.env.example`をコピーして`.env`を作成し、必要な環境変数を設定してください。

- `UEC_ID`：電通大のID（アルファベットを含む、`x2500000`）
- `UEC_PASSWORD`：電通大アカウントのパスワード
- `UEC_TOTP_URL`：TOTPのQRコードのURL（例：`otpauth://totp/axiole:xxxx?secret=xxxx&issuer=axiole`)
