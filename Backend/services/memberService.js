const memberRepository = require("../repositories/memberRepository");

exports.getMembers = async (circleId = null) => {
    return await memberRepository.getMembers(circleId);
};