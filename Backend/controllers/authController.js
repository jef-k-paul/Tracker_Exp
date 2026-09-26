const jwt = require("jsonwebtoken");
const authService = require('../services/authServices');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

exports.loginWithKey = async (req, res) => {
    try {
        console.log("first req1, Request Body: ", req.body);
        const accessKey = req.body.accessKey;

        if(!accessKey){
            //error: no key given.
            return res.status(400).json({ message : "Unique key required."});
        }
        const user = await authService.login(accessKey);

        if(!user){
            //error user not found
            return res.status(401).json({ message : "Invalid Key."});
        }

        const token = jwt.sign(
            {
                memberId: user.member_id,
                name: user.name,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: "7h" }
        );

        res.json({
            token,
            member_id: user.member_id,
            memberId: user.member_id,
            name: user.name,
            role: user.role,
            user: user
        });
    }
    catch(err) {
        console.error(err);
        res.status(500).json({ message : `Server error. ${err}`});
    }
};