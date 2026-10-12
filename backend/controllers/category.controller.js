// controllers/category.controller.js
const Category = require('../models/Category.model');
const ApiResponse = require('../utils/ApiResponse');

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });

    ApiResponse.success(res, categories);
  } catch (error) {
    next(error);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return ApiResponse.error(res, 'Category not found', 404);
    }

    ApiResponse.success(res, category);
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, slug, imageUrl } = req.body;

    if (!name || !slug) {
      return ApiResponse.error(res, 'Name and slug are required', 400);
    }

    const category = await Category.create({
      name,
      description,
      slug: slug.toLowerCase(),
      imageUrl
    });

    ApiResponse.success(res, category, 'Category created', 201);
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return ApiResponse.error(res, 'Category not found', 404);
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    ApiResponse.success(res, category, 'Category updated');
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return ApiResponse.error(res, 'Category not found', 404);
    }

    category.isActive = false;
    await category.save();

    ApiResponse.success(res, {}, 'Category deleted');
  } catch (error) {
    next(error);
  }
};