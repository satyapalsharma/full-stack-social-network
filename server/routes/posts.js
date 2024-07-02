```javascript
/**
 * @file server/routes/posts.js
 * @description Defines API routes for post-related operations.
 * @author Senior Developer
 */

const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');

const router = express.Router();

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
    const { content, imageUrl } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ msg: 'Post content cannot be empty' });
    }

    try {
        const newPost = new Post({
            content,
            imageUrl,
            author: req.user.id,
        });

        const post = await newPost.save();

        // Populate author details for the response to avoid a separate client-side fetch
        const populatedPost = await Post.findById(post._id).populate('author', ['username', 'profilePicture']);

        res.status(201).json(populatedPost);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   GET /api/posts
 * @desc    Get all posts for the user's feed (paginated)
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    try {
        const totalPosts = await Post.countDocuments();
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(startIndex)
            .populate('author', ['username', 'profilePicture'])
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   GET /api/posts/user/:userId
 * @desc    Get all posts by a specific user
 * @access  Private
 */
router.get('/user/:userId', auth, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        return res.status(400).json({ msg: 'Invalid user ID' });
    }

    try {
        const posts = await Post.find({ author: req.params.userId })
            .sort({ createdAt: -1 })
            .populate('author', ['username', 'profilePicture']);

        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   GET /api/posts/:id
 * @desc    Get a single post by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid post ID' });
    }

    try {
        const post = await Post.findById(req.params.id)
            .populate('author', ['username', 'profilePicture'])
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                },
                options: { sort: { createdAt: -1 } }
            });

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   PUT /api/posts/:id
 * @desc    Update a post
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid post ID' });
    }

    const { content } = req.body;
    if (!content || content.trim() === '') {
        return res.status(400).json({ msg: 'Content is required for update' });
    }

    try {
        let post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check if the user owns the post
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'User not authorized' });
        }

        post.content = content;
        // Mongoose timestamps will automatically update `updatedAt`
        const updatedPost = await post.save();

        // Repopulate to send back full details
        const populatedPost = await updatedPost.populate('author', ['username', 'profilePicture']);

        res.json(populatedPost);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete a post
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid post ID' });
    }

    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check if the user owns the post
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'User not authorized' });
        }

        // Delete associated comments first to maintain data integrity
        await Comment.deleteMany({ _id: { $in: post.comments } });

        await post.remove();

        res.json({ msg: 'Post and associated comments removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   PUT /api/posts/:id/like
 * @desc    Like or unlike a post
 * @access  Private
 */
router.put('/:id/like', auth, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid post ID' });
    }

    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check if the post has already been liked by this user
        if (post.likes.some(like => like.toString() === req.user.id)) {
            // Unlike the post
            post.likes = post.likes.filter(
                like => like.toString() !== req.user.id
            );
        } else {
            // Like the post
            post.likes.unshift(req.user.id);
        }

        await post.save();
        
        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   POST /api/posts/:id/comments
 * @desc    Add a comment to a post
 * @access  Private
 */
router.post('/:id/comments', auth, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid post ID' });
    }

    const { text } = req.body;
    if (!text || text.trim() === '') {
        return res.status(400).json({ msg: 'Comment text is required' });
    }

    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        const newComment = new Comment({
            text,
            author: req.user.id,
            post: req.params.id,
        });

        const savedComment = await newComment.save();

        post.comments.unshift(savedComment._id);
        await post.save();

        // Populate the author of the new comment before sending it back
        const populatedComment = await Comment.findById(savedComment._id)
            .populate('author', ['username', 'profilePicture']);

        res.status(201).json(populatedComment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   DELETE /api/posts/:postId/comments/:commentId
 * @desc    Delete a comment
 * @access  Private
 */
router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
    const { postId, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ msg: 'Invalid ID provided' });
    }

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ msg: 'Comment not found' });
        }

        // Check if the user is the author of the comment OR the author of the post
        if (comment.author.toString() !== req.user.id && post.author.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'User not authorized to delete this comment' });
        }

        // Remove comment reference from post's comments array
        await Post.updateOne({ _id: postId }, { $pull: { comments: commentId } });

        // Remove the comment document itself
        await comment.remove();

        res.json({ msg: 'Comment removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
