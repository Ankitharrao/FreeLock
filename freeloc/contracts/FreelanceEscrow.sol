// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FreelanceEscrow {

    enum Status {
        OPEN,
        FUNDED,
        SUBMITTED,
        APPROVED,
        DISPUTED,
        RESOLVED,
        CANCELLED
    }

    struct Contract {
        uint256 id;
        address client;
        address freelancer;
        address arbiter;
        uint256 amount;
        uint256 deadline;
        string title;
        string description;
        Status status;
        string submissionNote;
        string disputeReason;
        uint256 createdAt;
    }

    uint256 public contractCount;
    mapping(uint256 => Contract) public contracts;
    mapping(address => uint256[]) public clientContracts;
    mapping(address => uint256[]) public freelancerContracts;

    address public owner;
    uint256 public feeBps = 200;

    event ContractCreated(uint256 indexed id, address client, address freelancer, uint256 amount);
    event EscrowFunded(uint256 indexed id, uint256 amount);
    event WorkSubmitted(uint256 indexed id, string note);
    event WorkApproved(uint256 indexed id);
    event PaymentReleased(uint256 indexed id, address freelancer, uint256 amount);
    event DisputeRaised(uint256 indexed id, string reason);
    event DisputeResolved(uint256 indexed id, address recipient, uint256 amount);
    event ContractCancelled(uint256 indexed id);

    modifier onlyClient(uint256 _id) {
        require(msg.sender == contracts[_id].client, "Not the client");
        _;
    }

    modifier onlyFreelancer(uint256 _id) {
        require(msg.sender == contracts[_id].freelancer, "Not the freelancer");
        _;
    }

    modifier onlyArbiter(uint256 _id) {
        require(msg.sender == contracts[_id].arbiter, "Not the arbiter");
        _;
    }

    modifier inStatus(uint256 _id, Status _status) {
        require(contracts[_id].status == _status, "Invalid contract status");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createContract(
        address _freelancer,
        address _arbiter,
        uint256 _deadline,
        string calldata _title,
        string calldata _description
    ) external returns (uint256) {
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_freelancer != msg.sender, "Client cannot be freelancer");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(bytes(_title).length > 0, "Title required");

        uint256 id = ++contractCount;
        Contract storage c = contracts[id];

        c.id         = id;
        c.client     = msg.sender;
        c.freelancer = _freelancer;
        c.arbiter    = _arbiter != address(0) ? _arbiter : owner;
        c.deadline   = _deadline;
        c.title      = _title;
        c.description= _description;
        c.status     = Status.OPEN;
        c.createdAt  = block.timestamp;

        clientContracts[msg.sender].push(id);
        freelancerContracts[_freelancer].push(id);

        emit ContractCreated(id, msg.sender, _freelancer, 0);
        return id;
    }

    function fundEscrow(uint256 _id)
        external
        payable
        onlyClient(_id)
        inStatus(_id, Status.OPEN)
    {
        require(msg.value > 0, "Must send ETH to fund escrow");
        contracts[_id].amount = msg.value;
        contracts[_id].status = Status.FUNDED;
        emit EscrowFunded(_id, msg.value);
    }

    function submitWork(uint256 _id, string calldata _note)
        external
        onlyFreelancer(_id)
        inStatus(_id, Status.FUNDED)
    {
        contracts[_id].submissionNote = _note;
        contracts[_id].status = Status.SUBMITTED;
        emit WorkSubmitted(_id, _note);
    }

    function approveWork(uint256 _id)
        external
        onlyClient(_id)
        inStatus(_id, Status.SUBMITTED)
    {
        Contract storage c = contracts[_id];
        c.status = Status.APPROVED;

        uint256 fee    = (c.amount * feeBps) / 10000;
        uint256 payout = c.amount - fee;

        emit WorkApproved(_id);
        emit PaymentReleased(_id, c.freelancer, payout);

        (bool sent, ) = payable(c.freelancer).call{ value: payout }("");
        require(sent, "Payment failed");

        if (fee > 0) {
            (bool feeSent, ) = payable(owner).call{ value: fee }("");
            require(feeSent, "Fee transfer failed");
        }
    }

    function raiseDispute(uint256 _id, string calldata _reason)
        external
        onlyClient(_id)
        inStatus(_id, Status.SUBMITTED)
    {
        contracts[_id].disputeReason = _reason;
        contracts[_id].status = Status.DISPUTED;
        emit DisputeRaised(_id, _reason);
    }

    function resolveDispute(uint256 _id, uint256 _freelancerPct)
        external
        onlyArbiter(_id)
        inStatus(_id, Status.DISPUTED)
    {
        require(_freelancerPct <= 100, "Percentage must be 0-100");

        Contract storage c = contracts[_id];
        c.status = Status.RESOLVED;

        uint256 toFreelancer = (c.amount * _freelancerPct) / 100;
        uint256 toClient     = c.amount - toFreelancer;

        emit DisputeResolved(_id, c.freelancer, toFreelancer);

        if (toFreelancer > 0) {
            (bool s1, ) = payable(c.freelancer).call{ value: toFreelancer }("");
            require(s1, "Freelancer payment failed");
        }
        if (toClient > 0) {
            (bool s2, ) = payable(c.client).call{ value: toClient }("");
            require(s2, "Client refund failed");
        }
    }

    function cancelContract(uint256 _id)
        external
        onlyClient(_id)
        inStatus(_id, Status.OPEN)
    {
        contracts[_id].status = Status.CANCELLED;
        emit ContractCancelled(_id);
    }

    function getClientContracts(address _client) external view returns (uint256[] memory) {
        return clientContracts[_client];
    }

    function getFreelancerContracts(address _freelancer) external view returns (uint256[] memory) {
        return freelancerContracts[_freelancer];
    }

    function getContractStatus(uint256 _id) external view returns (Status) {
        return contracts[_id].status;
    }

    function setFeeBps(uint256 _bps) external {
        require(msg.sender == owner, "Not owner");
        require(_bps <= 1000, "Fee cannot exceed 10%");
        feeBps = _bps;
    }
}