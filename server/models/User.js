const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * @typedef {object} User
 * @property {string} username - The user's unique username.
 * @property {string} email - The user's unique email address.
 * @property {string} password - The user's hashed password.
 * @property {object} profile - The user's profile information.
 * @property {string} profile.firstName - The user's first name.
 * @property {string} profile.lastName - The user's last name.
 * @property {string} profile.bio - A short biography of the user.
 * @property {string} profile.location - The user's location.
 * @property {string} profile.website - The user's personal website URL.
 * @property {Date} profile.birthDate - The user's date of birth.
 * @property {object} avatar - The user's profile picture.
 * @property {string} avatar.url - The URL of the avatar image.
 * @property {string} avatar.public_id - The public ID for the image (e.g., from Cloudinary).
 * @property {object} coverPhoto - The user's profile cover photo.
 * @property {string} coverPhoto.url - The URL of the cover photo image.
 * @property {string} coverPhoto.public_id - The public ID for the image.
 * @property {mongoose.Schema.Types.ObjectId[]} followers - Array of user IDs who follow this user.
 * @property {mongoose.Schema.Types.ObjectId[]} following - Array of user IDs this user follows.
 * @property {mongoose.Schema.Types.ObjectId[]} posts - Array of post IDs created by this user.
 * @property {mongoose.Schema.Types.ObjectId[]} savedPosts - Array of post IDs saved by this user.
 * @property {boolean} isVerified - Flag indicating if the user's email is verified.
 * @property {string} role - The user's role (e.g., 'user', 'admin').
 * @property {Date} lastLogin - The timestamp of the user's last login.
 * @property {string} passwordResetToken - Token for password reset functionality.
 * @property {Date} passwordResetExpires - Expiration date for the password reset token.
 */
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [20, 'Username cannot be more than 20 characters long'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not return password by default in queries
    },
    profile: {
      firstName: { type: String, trim: true, maxlength: 50, default: '' },
      lastName: { type: String, trim: true, maxlength: 50, default: '' },
      bio: { type: String, maxlength: 160, default: '' },
      location: { type: String, trim: true, maxlength: 100, default: '' },
      website: { type: String, trim: true, maxlength: 100, default: '' },
      birthDate: { type: Date },
    },
    avatar: {
      url: {
        type: String,
        default: 'https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_thumb,g_face,r_max/default_avatar.png',
      },
      public_id: { type: String, default: null },
    },
    coverPhoto: {
      url: {
        type: String,
        default: 'https://res.cloudinary.com/demo/image/upload/c_fill,h_200,w_800/sample.jpg',
      },
      public_id: { type: String, default: null },
    },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    lastLogin: {
      type: Date,
    },
    // For password reset functionality
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
    toJSON: { virtuals: true }, // Ensure virtuals are included in toJSON()
    toObject: { virtuals: true }, // Ensure virtuals are included in toObject()
  }
);

// Virtual property for full name
UserSchema.virtual('fullName').get(function () {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  if (this.profile.firstName) {
    return this.profile.firstName;
  }
  if (this.profile.lastName) {
    return this.profile.lastName;
  }
  return this.username;
});

// Virtual properties for follower/following counts
UserSchema.virtual('followerCount').get(function () {
  return this.followers.length;
});

UserSchema.virtual('followingCount').get(function () {
  return this.following.length;
});

/**
 * Mongoose pre-save middleware.
 * Hashes the user's password before saving it to the database.
 */
UserSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compares the entered password with the hashed password in the database.
 * @param {string} enteredPassword - The password to compare.
 * @returns {Promise<boolean>} - True if the passwords match, false otherwise.
 */
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Generates a signed JSON Web Token (JWT) for the user.
 * @returns {string} - The signed JWT.
 */
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

module.exports = mongoose.model('User', UserSchema);