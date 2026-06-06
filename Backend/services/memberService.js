const memberRepository = require("../repositories/memberRepository");

exports.getMembers = async () => {
    return await memberRepository.getMembers();
};