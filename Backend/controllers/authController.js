const authService = require('../services/authServices');


exports.loginWithKey = async (req, res) => {
    try {
        console.log(req.body);
        const accessKey = req.body.accessKey;

        if(!accessKey){
            //error: no key given.
            return res.status(400).json({ message : "Unique key required."})
        }
        const user = await authService.login(accessKey);

        if(!user){
            //error user not found
            return res.status(401).json({ message : "Invalid Key."})
        }
        res.json(user);
    }
    catch(err) {
        console.error(err);
        res.status(500).json({ message : `Server error. ${err}`});
    }
};