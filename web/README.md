# Serving the app

### Start the api server
`PORT=2000 pm2 start server.js --name shades-production-api`

### Start the frontend
Create a production build of the app. Nginx will serve the above generated assets.
```
cd web/client
npm run build
```

#### Setup pm2 to start on system boot:
```
sudo env PATH=$PATH:/home/pi/.nvm/versions/node/v14.16.1/bin /home/pi/.nvm/versions/node/v14.16.1/lib/node_modules/pm2/bin/pm2 startup systemd -u pi --hp /home/pi
```

## Configure the API upstream and react prod build in the default nginx server block
```
root /home/pi/shademaker/web/client/build;

location /api {
  proxy_pass http://localhost:2000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

### Serving for development:
```
yarn dev
```
