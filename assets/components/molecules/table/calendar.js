import $ from 'jquery';

export default () => {
  console.log("READY calendar!");
  $.ajax({
    url: 'https://api.airtable.com/v0/appOvGQqOefkMpE9o/Concerts?api_key=keyO8mLzx0rpa46cY',
    beforeSend: function(xhr) {
      xhr.setRequestHeader("Authorization", "Bearer 6QXNMEMFHNY4FJ5ELNFMP5KRW52WFXN5")
    }, success: function(data){
      // alert(data);
      //process the JSON data etc
    }
  })
};
