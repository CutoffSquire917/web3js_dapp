// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Forum {

    struct Post {
        uint id;
        string content;
        address author;
        uint timestamp;
        uint like;
        bool deleted;
    }

    event PostCreated(address indexed author, uint timestamp);
    event PostDeleted(address indexed author, uint indexed id);
    event PostLiked(address indexed user, uint indexed id, bool liked);

    Post[] posts;
    mapping(uint => mapping(address => bool)) liked;

    function create_post(string memory content) external {
        posts.push(Post(posts.length, content, msg.sender, block.timestamp, 0, false));
        emit PostCreated(msg.sender, block.timestamp);
    }

    function _collect(address author, bool filter) internal view returns (Post[] memory) {
        uint count;
        for (uint i = 0; i < posts.length; i++) {
            if (!posts[i].deleted && (!filter || posts[i].author == author)) count++;
        }
        Post[] memory result = new Post[](count);
        uint j;
        for (uint i = 0; i < posts.length; i++) {
            if (!posts[i].deleted && (!filter || posts[i].author == author)) {
                result[j++] = posts[i];
            }
        }
        return result;
    }

    function get_posts() external view returns (Post[] memory) {
        return _collect(address(0), false);
    }

    function get_posts_by_author(address author) external view returns (Post[] memory) {
        return _collect(author, true);
    }

    function get_post(uint id) external view returns (Post memory) {
        require(id < posts.length && !posts[id].deleted, "Not found");
        return posts[id];
    }

    function delete_post(uint id) external {
        require(id < posts.length && !posts[id].deleted, "Not found");
        require(posts[id].author == msg.sender, "Not author");
        posts[id].deleted = true;
        emit PostDeleted(msg.sender, id);
    }

    function delete_my_posts() external {
        for (uint i = 0; i < posts.length; i++) {
            if (!posts[i].deleted && posts[i].author == msg.sender) {
                posts[i].deleted = true;
                emit PostDeleted(msg.sender, i);
            }
        }
    }

    function toggle_like(uint id) external {
        require(id < posts.length && !posts[id].deleted, "Not found");
        if (liked[id][msg.sender]) {
            liked[id][msg.sender] = false;
            posts[id].like--;
        } else {
            liked[id][msg.sender] = true;
            posts[id].like++;
        }
        emit PostLiked(msg.sender, id, liked[id][msg.sender]);
    }

    function has_liked(uint id, address user) external view returns (bool) {
        return liked[id][user];
    }
}
