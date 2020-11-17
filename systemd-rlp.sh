[Unit]
Description=Lojban Chat Bridge

[Service]
Restart=always
#StandardOutput=syslog
#StandardError=syslog
SyslogIdentifier=lojban-1chat
WorkingDirectory=/home/gleki/Lojban-1Chat-Bridge
ExecStart=./docker_start-rlp.sh 9091

[Install]
WantedBy=default.target
