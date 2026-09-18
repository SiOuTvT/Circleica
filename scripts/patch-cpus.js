const os=require("os");const o=os.cpus;os.cpus=()=>o().slice(0,2)
