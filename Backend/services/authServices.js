const memberRepository = require('../repositories/memberRepository');

exports.login = async (accessKey) => {
    const user = await memberRepository.findById(accessKey); //can we add try catch here/
    return user;
}