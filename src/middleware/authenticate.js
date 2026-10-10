const jwt = require('jsonwebtoken');
module.exports = function authenticate(req, res, next) {
    const h = req.headers.authorization;
    if(!h || !h.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token'});
    try{
        const p = jwt.verify(h.slice(7), process.env.JWT_SECRET);
        req.user = {id: p.id, role: p.role};
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};