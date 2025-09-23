module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'supersecretkey',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
    jwtAlgorithm: process.env.JWT_ALG || 'HS256'
};