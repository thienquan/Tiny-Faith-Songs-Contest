# Tiny Faith Songs Contest

Huong dan cai dat va deploy du an len VPS de chay production.

## 1) Tong quan du an

Repository nay co 2 service chinh:

- `backend`: API FastAPI (dang ky, upload, Google Drive, gui email SMTP)
- `frontend`: ung dung Next.js (trang cuoc thi + form nop bai)

Mo hinh production de xuat:

- `frontend` chay tai `127.0.0.1:3000`
- `backend` chay tai `127.0.0.1:8001`
- Nginx lang nghe cong `80/443`, proxy traffic vao frontend
- Frontend rewrite `/api/*` ve backend thong qua `BACKEND_BASE_URL`

## 2) Yeu cau VPS

- Ubuntu 22.04+ (hoac Linux tuong duong)
- Toi thieu 2 vCPU / 4 GB RAM
- Da tro domain ve IP public cua VPS
- Mo cong: `22`, `80`, `443`

## 3) Cai goi he thong

```bash
sudo apt update
sudo apt install -y git curl nginx python3 python3-venv python3-pip nodejs npm
```

Neu Node.js tren may qua cu, hay cai Node 18+.

```bash
node -v
npm -v
python3 -V
```

## 4) Clone du an

```bash
cd /opt
sudo git clone <YOUR_REPO_URL> tiny-faith-songs
sudo chown -R $USER:$USER /opt/tiny-faith-songs
cd /opt/tiny-faith-songs
```

## 5) Setup backend

```bash
cd /opt/tiny-faith-songs/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Tao file env backend tu template:

```bash
cp .env.example .env
```

Cau hinh gia tri that trong `.env`:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_EMAIL`
- `FOLDER_ID` (hoac `SHARED_DRIVE_FOLDER_ID`)
- `GOOGLE_SERVICE_ACCOUNT_JSON` (duong dan tuyet doi tren VPS)
- `SQLITE_PATH` (vi du `/opt/tiny-faith-songs/backend/data/tinyfaith.db`)
- `CORS_ORIGINS` (vi du `https://your-domain.com`)

Dat file key service-account cua Google len VPS, vi du:

```bash
mkdir -p /opt/tiny-faith-songs/credentials
chmod 700 /opt/tiny-faith-songs/credentials
# upload key vao /opt/tiny-faith-songs/credentials/
chmod 600 /opt/tiny-faith-songs/credentials/*.json
```

## 6) Setup frontend

```bash
cd /opt/tiny-faith-songs/frontend
npm ci
npm run build
```

Trong production, dat backend base URL ve backend local:

- `BACKEND_BASE_URL=http://127.0.0.1:8001`

Co the khai bao bien nay trong file systemd cua frontend (dong `Environment=`).

## 7) Tao service systemd cho backend

Tao file `/etc/systemd/system/tinyfaith-backend.service`:

```ini
[Unit]
Description=Tiny Faith Songs Backend (FastAPI)
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/tiny-faith-songs/backend
EnvironmentFile=/opt/tiny-faith-songs/backend/.env
ExecStart=/opt/tiny-faith-songs/backend/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

## 8) Tao service systemd cho frontend

Tao file `/etc/systemd/system/tinyfaith-frontend.service`:

```ini
[Unit]
Description=Tiny Faith Songs Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/tiny-faith-songs/frontend
Environment=NODE_ENV=production
Environment=BACKEND_BASE_URL=http://127.0.0.1:8001
ExecStart=/usr/bin/npm run prod
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable va start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tinyfaith-backend tinyfaith-frontend
sudo systemctl start tinyfaith-backend tinyfaith-frontend
sudo systemctl status tinyfaith-backend --no-pager
sudo systemctl status tinyfaith-frontend --no-pager
```

## 9) Cau hinh Nginx

Tao file `/etc/nginx/sites-available/tinyfaith`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 2048M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/tinyfaith /etc/nginx/sites-enabled/tinyfaith
sudo nginx -t
sudo systemctl reload nginx
```

## 10) Bat HTTPS bang LetsEncrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 11) Kiem tra nhanh sau deploy

```bash
curl -s http://127.0.0.1:8001/api/health
curl -I http://127.0.0.1:3000
curl -I https://your-domain.com
```

Kiem tra tren trinh duyet:

- Trang chu load duoc
- Form dang ky gui duoc
- Upload hoat dong
- Email thong bao gui thanh cong

## 12) Van hanh thuong ngay

Restart service:

```bash
sudo systemctl restart tinyfaith-backend tinyfaith-frontend
```

Xem log:

```bash
sudo journalctl -u tinyfaith-backend -f
sudo journalctl -u tinyfaith-frontend -f
```

Cap nhat code moi:

```bash
cd /opt/tiny-faith-songs
git pull

cd backend
source .venv/bin/activate
pip install -r requirements.txt

cd ../frontend
npm ci
npm run build

sudo systemctl restart tinyfaith-backend tinyfaith-frontend
```

## 13) Luu y bao mat

- Khong commit secret that (`.env`, JSON service-account, mat khau SMTP).
- Han che quyen doc file secret cho dung user can thiet.
- Neu scale he thong, nen dua secret vao secret manager.
- Neu secret da bi lo, hay rotate ngay.
