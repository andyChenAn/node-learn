class Database extends EventEmitter {
	constructor (path) {
		super();
		this.path = path;
		this._records = Object.create(null);  //定义一个空对象
		this._writeStream = fs.createWriteStream(path , {
			encoding : 'utf8',
			flags : 'a'
		});
		this._load();
	}
	_load () {
		const readable = fs.createReadStream(this.path);
		let data = '';
		readable.on('data' , chunk => {
			data += chunk.toString();
			let records = data.split('\n');
			data = records.pop();
			for (let i = 0 ; i < records.length ; i++) {
				try {
					let record = JSON.parse(records[i]);
					if (record.value == null) {
						delete this._records[record.key];
					} else {
						this._records[record.key] = record.value;
					}
				} catch (e) {
					this.emit('error' , 'found invalid record : ' + records[i]);
				}
			}
		});
		readable.on('end' , () => {
			this.emit('load');
		})
	}
	get (key) {
		return this._records[key] || null;
	}
	set (key , value , callback) {
		let toWrite = JSON.stringify({key : key , value : value}) + '\n';
		if (value == null) {
			delete this._records[key];
		} else {
			this._records[key] = value;
		};
		this._writeStream.write(toWrite , callback);
	}
	delete (key , callback) {
		return this.set(key , null , callback);
	}
}
module.exports = Database;