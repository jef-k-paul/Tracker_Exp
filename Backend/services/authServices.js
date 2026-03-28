const memberRepository = require('../repositories/memberRepository');

exports.login = async (accessKey) => {
    const user = await memberRepository.findById(accessKey);
    return user;
}