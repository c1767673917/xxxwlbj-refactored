const path = require('path');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'data', 'logistics.db')
    },
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILENAME || path.join(__dirname, 'data', 'test_e2e.db')
    },
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  },

  production: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILENAME || path.join(__dirname, 'data', 'database.sqlite')
    },
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    useNullAsDefault: true,
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      afterCreate: (conn, cb) => {
        // 启用外键约束
        conn.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) return cb(err);

          // 启用WAL模式提高并发性能
          conn.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) return cb(err);

            // 设置同步模式为NORMAL，平衡性能和安全性
            conn.run('PRAGMA synchronous = NORMAL', (err) => {
              if (err) return cb(err);

              // 设置缓存大小为64MB
              conn.run('PRAGMA cache_size = -64000', (err) => {
                if (err) return cb(err);

                // 设置页面大小为4KB
                conn.run('PRAGMA page_size = 4096', (err) => {
                  if (err) return cb(err);

                  // 设置临时存储为内存
                  conn.run('PRAGMA temp_store = MEMORY', (err) => {
                    if (err) return cb(err);

                    // 设置mmap大小为256MB
                    conn.run('PRAGMA mmap_size = 268435456', (err) => {
                      if (err) return cb(err);

                      // 启用查询优化器
                      conn.run('PRAGMA optimize', cb);
                    });
                  });
                });
              });
            });
          });
        });
      }
    }
  }
};
