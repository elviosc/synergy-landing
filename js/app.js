(function($) {
  var update = function() {
    $(this).parent().attr('data-value', $(this).val());
  };
  $(document).on('click change update', '.select-wrapper>select', update);
  $('.select-wrapper>select').trigger('update');
})(jQuery);